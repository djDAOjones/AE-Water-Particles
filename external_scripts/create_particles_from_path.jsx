/*
  create_particles_from_path.jsx
  After Effects ExtendScript to automate creation of null and particle layers along a path.
  User-configurable: animation duration, number of copies.
  
  Usage: Run from File > Scripts > Run Script File...
*/

(function createParticlesFromPath() {
    // --- USER INPUTS: Set these for your project ---
    // Waterway velocity in metres per second
    var waterway_velocity = 0.4; // m/s (e.g., river or canal flow)
    // Time factor to scale animation speed (higher = faster animation)
    var time_factor = 100000; // (unitless, tweak for visual effect; default: 100,000)
    // Composition scale: how many pixels = 1 km in your comp
    var comp_scale = 733; // px/km (default: 733px = 1km)

    // Waterway discharge in cubic meters per second (m³/s)
    var waterway_discharge = 80; // m³/s (e.g., typical river flow)
    // Particle density: how many particles per km per 1 m³/s
    var particles_per_km_per_cumec = 2; // Reduced particle density
    // Wiggle speed (random change attempts per second)
    var random_speed = 1; // Hz (default: 1)
    // Wiggle magnitude (fraction of allowed band)
    var random_magnitude = 0.15; // (default: 0.15, i.e. 15% of allowed band)
    // --- END USER INPUTS ---

    // Animation duration will be calculated after path length is known
    var animationDuration = null;
    var numCopies = null; // Will be set after path length is known
    var totalCopies = 1000; // Used for initial distribution/offset


    // Assume user has a comp and a path layer selected
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem) || comp.selectedLayers.length < 1) {
        alert("Please select a composition and a path layer (e.g., a shape or mask) in the timeline.");
        return;
    }
    var pathLayer = comp.selectedLayers[0];

    app.beginUndoGroup("Create Particles from Path");

    // Try to get the path property (mask or shape)
    function findPathProperty(group) {
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            if (prop.matchName === "ADBE Vector Shape") {
                return prop;
            } else if (prop.numProperties && prop.numProperties > 0) {
                var found = findPathProperty(prop);
                if (found) return found;
            }
        }
        return null;
    }

    var pathProperty = null;
    if (pathLayer.property("Masks") && pathLayer.property("Masks").numProperties > 0) {
        pathProperty = pathLayer.property("Masks").property(1).property("maskPath");
    } else if (pathLayer.property("Contents")) {
        pathProperty = findPathProperty(pathLayer.property("Contents"));
    }
    if (!pathProperty) {
        alert("Could not find a path (mask or shape) on the selected layer.");
        app.endUndoGroup();
        return;
    }

    var path = pathProperty.value;
    var points = path.vertices;
    var numPoints = points.length;

    // Find the parent shape group of the path (to get its transform)
    function findParentGroup(prop) {
        var parent = prop.parentProperty;
        while (parent && parent.matchName !== "ADBE Vector Group") {
            parent = parent.parentProperty;
        }
        return parent;
    }
    var parentGroup = findParentGroup(pathProperty);
    var groupTransform = parentGroup ? parentGroup.property("Transform") : null;
    var groupPosition = groupTransform ? groupTransform.property("Position").value : [0, 0];
    var layerPosition = pathLayer.property("Position").value;

    // --- Find original stroke width ---
    function findStrokeWidth(group) {
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            if (prop.matchName === "ADBE Vector Graphic - Stroke") {
                var sw = prop.property("Stroke Width").value;
                if (sw) return sw;
            } else if (prop.numProperties && prop.numProperties > 0) {
                var found = findStrokeWidth(prop);
                if (found) return found;
            }
        }
        return null;
    }
    var origStrokeWidth = parentGroup ? findStrokeWidth(parentGroup) : null;
    if (!origStrokeWidth) origStrokeWidth = 8; // fallback default

    // --- Path Resampling for Even Arc Length along the true Bezier curve ---
    // 1. Oversample curve at high t resolution
    function cubicBezier(p0, p1, p2, p3, t) {
        var mt = 1-t;
        return [
            mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
            mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1]
        ];
    }
    var inTangents = path.inTangents;
    var outTangents = path.outTangents;
    var closed = path.closed;
    var segments = numPoints - 1 + (closed ? 1 : 0);
    var oversample = 1000;
    var curvePoints = [];
    var curveTs = [];
    for (var seg = 0; seg < segments; seg++) {
        var i0 = seg;
        var i1 = (seg+1)%numPoints;
        var p0 = [points[i0][0] + groupPosition[0] + layerPosition[0], points[i0][1] + groupPosition[1] + layerPosition[1]];
        var p1 = [points[i0][0] + outTangents[i0][0] + groupPosition[0] + layerPosition[0], points[i0][1] + outTangents[i0][1] + groupPosition[1] + layerPosition[1]];
        var p2 = [points[i1][0] + inTangents[i1][0] + groupPosition[0] + layerPosition[0], points[i1][1] + inTangents[i1][1] + groupPosition[1] + layerPosition[1]];
        var p3 = [points[i1][0] + groupPosition[0] + layerPosition[0], points[i1][1] + groupPosition[1] + layerPosition[1]];
        for (var j = 0; j < oversample; j++) {
            var t = j/(oversample-1);
            curvePoints.push(cubicBezier(p0,p1,p2,p3,t));
            curveTs.push(seg + t);
        }
    }
    // 2. Compute arc lengths
    function distance(a, b) {
        var dx = a[0] - b[0];
        var dy = a[1] - b[1];
        return Math.sqrt(dx*dx + dy*dy);
    }
    var arcLengths = [0];
    for (var i = 1; i < curvePoints.length; i++) {
        arcLengths.push(arcLengths[i-1] + distance(curvePoints[i-1], curvePoints[i]));
    }
    var totalLength = arcLengths[arcLengths.length-1];
    // 3. Resample N points at even arc length
    var N = 100;
    var compPoints = [];
    for (var k = 0; k < N; k++) {
        var targetLen = (k/(N-1)) * totalLength;
        // Find closest arc length index
        var idx = 0;
        while (idx < arcLengths.length-1 && arcLengths[idx] < targetLen) idx++;
        compPoints.push(curvePoints[idx]);
    }
    // Store as a marker comment on the path layer (comma-separated)


    // --- Calculate animation duration based on physical velocity and comp scale ---
    // totalLength is in comp pixels; comp_scale is px/km
    // Convert path length from px to km, then to meters
    var pathLength_km = totalLength / comp_scale;
    var pathLength_m = pathLength_km * 1000;

    // --- Calculate number of particles based on discharge and path length ---
    // numCopies = discharge (m³/s) × particles_per_km_per_cumec × pathLength_km
    numCopies = Math.round(waterway_discharge * particles_per_km_per_cumec * pathLength_km);
    // Clamp to at least 1 particle
    if (!isFinite(numCopies) || numCopies < 1) numCopies = 1;

    // Animation duration (seconds) = (path length in meters) / (velocity in m/s) / (time_factor/1000)
    // Higher time_factor = faster animation
    animationDuration = (pathLength_m / waterway_velocity) / (time_factor / 1000);
    // Clamp to a practical maximum duration (10 minutes = 600 seconds)
    // NOTE: Duration can become very large if the path is long, velocity is slow, or time_factor is high.
    // Clamping ensures the animation stays manageable and avoids AE errors.
    var maxDuration = 600;
    if (!isFinite(animationDuration) || animationDuration < 0.1) animationDuration = 10;
    if (animationDuration > maxDuration) animationDuration = maxDuration;
    var flatCompPoints = [];
    for (var q = 0; q < compPoints.length; q++) {
        flatCompPoints.push(compPoints[q][0], compPoints[q][1]);
    }
    pathLayer.property("Marker").setValueAtTime(0, new MarkerValue("pathPoints:" + flatCompPoints.join(",")));

    // Create null and particle layers at intervals along the path
    for (var i = 0; i < numCopies; i++) {
        var t = i / totalCopies; // offset as if there are 1000 layers
        var idx = Math.floor(t * (compPoints.length - 1));
        idx = Math.max(0, Math.min(idx, compPoints.length - 1)); // Ensure in-bounds
        var pos = compPoints[idx];
        if (!pos || pos.length !== 2 || isNaN(pos[0]) || isNaN(pos[1])) {
            alert("Invalid position at idx " + idx + ": " + pos);
            continue;
        }

        // Create Null
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "Null " + (i+1);
        nullLayer.property("Position").setValue(pos);
        nullLayer.moveToBeginning();
        nullLayer.outPoint = nullLayer.inPoint + (10 * animationDuration);

        // Create Particle as a shape layer (ellipse, 20px, filled #00D0FF)
        var particleLayer = comp.layers.addShape();
        particleLayer.name = "Particle " + (i + 1);
        particleLayer.inPoint = 0;
        particleLayer.outPoint = particleLayer.inPoint + (10 * animationDuration);

        // Add ellipse
        var contents = particleLayer.property("Contents");
        var ellipseGroup = contents.addProperty("ADBE Vector Group");
        ellipseGroup.name = "Ellipse 1";
        var ellipse = ellipseGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
        // Set ellipse size to 1/3 of original stroke width
        var ellipseSize = origStrokeWidth * 0.25;
        ellipse.property("Size").setValue([ellipseSize, ellipseSize]);
        // Add fill
        var fill = ellipseGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue([0/255, 179/255, 219/255]);

        // --- Apply Path-Following Expressions ---
        var pathLayerName = pathLayer.name;
        // Position Expression
        // --- Path-following with per-particle random wiggle ---
        // Distribute particles with static offset and animated wiggle, always within the path stroke width
        var allowedBand = origStrokeWidth - ellipseSize;
        var maxWiggle = allowedBand * random_magnitude; // wiggle can use up to random_magnitude of the band
        var staticBand = allowedBand/2 - maxWiggle; // static offset must leave room for wiggle
        var posExpr =
            'try {\n' +
            '  var marker = thisComp.layer("' + pathLayerName + '").marker.key(1).comment;\n' +
            '  if (!marker) throw "No marker";\n' +
            '  var arr = marker.match(/pathPoints:([\\d\\.,-]+)/)[1].split(",");\n' +
            '  var pts = [];\n' +
            '  for (var j = 0; j < arr.length; j += 2) { pts.push([parseFloat(arr[j]), parseFloat(arr[j+1])]); }\n' +
            '  if (pts.length < 2) throw "Not enough points";\n' +
            '  var n = ' + numCopies + ';\n' +
            '  var idx = index - (thisComp.numLayers - n);\n' +
            '  var dur = ' + animationDuration + ';\n' +
            '  var t = ((time/dur) + (idx/n)) % 1;\n' +
            '  var p = t * (pts.length - 1);\n' +
            '  var i0 = Math.floor(p);\n' +
            '  var i1 = Math.ceil(p);\n' +
            '  i0 = Math.max(0, Math.min(i0, pts.length - 1));\n' +
            '  i1 = Math.max(0, Math.min(i1, pts.length - 1));\n' +
            '  var frac = p - i0;\n' +
            '  var pt0 = pts[i0];\n' +
            '  var pt1 = pts[i1];\n' +
            '  seedRandom(index, true);\n' +
            '  var allowedBand = ' + allowedBand.toFixed(4) + ';\n' +
            '  var maxWiggle = ' + maxWiggle.toFixed(4) + ';\n' +
            '  var staticBand = ' + staticBand.toFixed(4) + ';\n' +
            '  var staticOffset = random(-staticBand, staticBand);\n' +
            '  // --- Sinusoidal wiggle only (no sample-and-hold) ---\n' +
            '  var random_speed = ' + random_speed.toFixed(4) + ';\n' +
            '  seedRandom(index, true);\n' +
            '  var phase = random(0, Math.PI * 2);\n' +
            '  var sinFreq = random_speed * 0.2;\n' +
            '  var sinMag = maxWiggle * 0.5;\n' +
            '  var wiggle = Math.sin(time * sinFreq * 2 * Math.PI + phase) * sinMag;\n' +
            '  var tangent = [pt1[0]-pt0[0], pt1[1]-pt0[1]];\n' +
            '  var norm = Math.sqrt(tangent[0]*tangent[0] + tangent[1]*tangent[1]);\n' +
            '  if (norm < 1e-6) throw "Zero tangent";\n' +
            '  var perp = [-tangent[1]/norm, tangent[0]/norm];\n' +
            '  var x = pt0[0] + (pt1[0]-pt0[0])*frac + perp[0]*(staticOffset + wiggle);\n' +
            '  var y = pt0[1] + (pt1[1]-pt0[1])*frac + perp[1]*(staticOffset + wiggle);\n' +
            '  if (isNaN(x) || isNaN(y)) throw "NaN result";\n' +
            '  [x, y];\n' +
            '} catch(err) { [0,0]; }';
        particleLayer.property("Position").expression = posExpr;
        // Rotation Expression
        var rotExpr =
            '// --- Orient particle to path direction ---\n' +
            'try {\n' +
            '  var marker = thisComp.layer("' + pathLayerName + '").marker.key(1).comment;\n' +
            '  var match = marker.match(/pathPoints:([\\d\\.,-]+)/);\n' +
            '  if (!match) throw "No pathPoints in marker";\n' +
            '  var arr = match[1].split(",").map(parseFloat);\n' +
            '  var points = [];\n' +
            '  for (var i = 0; i < arr.length; i += 2) points.push([arr[i], arr[i+1]]);\n' +
            '  if (points.length < 2) throw "Not enough points";\n' +
            '  var duration = 10;\n' +
            '  var offset = (index - 1) / thisComp.numLayers;\n' +
            '  var t = (time/duration + offset) % 1;\n' +
            '  var posIdx = t * (points.length - 1);\n' +
            '  var idxA = Math.floor(posIdx);\n' +
            '  var idxB = Math.min(idxA + 1, points.length - 1);\n' +
            '  var tangent = [\n' +
            '    points[idxB][0] - points[idxA][0],\n' +
            '    points[idxB][1] - points[idxA][1]\n' +
            '  ];\n' +
            '  radiansToDegrees(Math.atan2(tangent[1], tangent[0]));\n' +
            '} catch(err) { 0 }';
        particleLayer.property("Rotation").expression = rotExpr;


        // Parent particle to null (optional, can remove if not needed)
        // particleLayer.parent = nullLayer;
    }

    app.endUndoGroup();
    alert("Created " + numCopies + " null and particle pairs along the path.");
})();

/*
  create_particles_from_path.jsx
  After Effects ExtendScript to automate creation of null and particle layers along a path.
  User-configurable: animation duration, number of copies.
  
  Usage: Run from File > Scripts > Run Script File...
*/

(function createParticlesFromPath() {
    // Prompt user for main variables
    // Hardcoded for testing
    var animationDuration = 10;
    var numCopies = 100; // For dev: only create 100 layers
    var totalCopies = 1000; // But process as if there are 1000


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
        ellipse.property("Size").setValue([20, 20]);
        // Add fill
        var fill = ellipseGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue([0/255, 208/255, 255/255]);

        // --- Apply Path-Following Expressions ---
        var pathLayerName = pathLayer.name;
        // Position Expression
        var posExpr =
            '// --- Path-following with advanced randomization ---\n' +
            'var marker = thisComp.layer("' + pathLayerName + '").marker.key(1).comment;\n' +
            'var arr = marker.match(/pathPoints:([\\d\\.,-]+)/)[1].split(",").map(parseFloat);\n' +
            'var points = [];\n' +
            'for (var i = 0; i < arr.length; i += 2) points.push([arr[i], arr[i+1]]);\n' +
            'var duration = 10;\n' +
            '// Use totalCopies for offset so dev subset is unique\n' +
            'var totalCopies = 1000;\n' +
            'var offset = (index - 1) / totalCopies;\n' +
            '// --- Mild speed fluctuation (random walk) ---\n' +
            'seedRandom(index + 4321, true);\n' +
            'var driftFreq = random(0.005, 0.015);\n' +
            'var driftAmp = random(0.01, 0.03) * 3; // moderate scale\n' +
            'var drift = Math.sin(time * driftFreq * 2 * Math.PI + random(0, Math.PI*2)) * driftAmp;\n' +
            'var t = ((time/duration + offset + drift) % 1 + 1) % 1;\n' +
            'var posIdx = t * (points.length - 1);\n' +
            'var idxA = Math.floor(posIdx);\n' +
            'var idxB = Math.min(idxA + 1, points.length - 1);\n' +
            'var frac = posIdx - idxA;\n' +
            'var pos = [\n' +
            '  points[idxA][0] + (points[idxB][0] - points[idxA][0]) * frac,\n' +
            '  points[idxA][1] + (points[idxB][1] - points[idxA][1]) * frac\n' +
            '];\n' +
            '// --- Amplitude modulation with slow sine ---\n' +
            'seedRandom(index + 1234, true);\n' +
            'var ampBase = random(3, 8) * 2; // moderate scale\n' +
            'var ampModFreq = random(0.01, 0.035);\n' +
            'var ampModPhase = random(0, Math.PI*2);\n' +
            'var ampMod = 0.6 + 0.4 * Math.sin(time * ampModFreq * 2 * Math.PI + ampModPhase);\n' +
            'var amp = ampBase * ampMod * 2; // moderate scale\n' +
            'var freq = random(0.05, 0.15);\n' +
            'var phase = random(0, Math.PI*2);\n' +
            'var wiggle = Math.sin(time * freq * 2 * Math.PI + phase) * amp;\n' +
            'var tangent = [\n' +
            '  points[idxB][0] - points[idxA][0],\n' +
            '  points[idxB][1] - points[idxA][1]\n' +
            '];\n' +
            'var norm = Math.sqrt(tangent[0]*tangent[0] + tangent[1]*tangent[1]);\n' +
            'var perp = [-tangent[1]/norm, tangent[0]/norm];\n' +
            '[pos[0] + perp[0]*wiggle, pos[1] + perp[1]*wiggle]';
        particleLayer.property("Position").expression = posExpr;
        // Rotation Expression
        var rotExpr =
            '// --- Orient particle to path direction ---\n' +
            'var marker = thisComp.layer("' + pathLayerName + '").marker.key(1).comment;\n' +
            'var arr = marker.match(/pathPoints:([\\d\\.,-]+)/)[1].split(",").map(parseFloat);\n' +
            'var points = [];\n' +
            'for (var i = 0; i < arr.length; i += 2) points.push([arr[i], arr[i+1]]);\n' +
            'var duration = 10;\n' +
            'var offset = (index - 1) / thisComp.numLayers;\n' +
            'var t = (time/duration + offset) % 1;\n' +
            'var posIdx = t * (points.length - 1);\n' +
            'var idxA = Math.floor(posIdx);\n' +
            'var idxB = Math.min(idxA + 1, points.length - 1);\n' +
            'var tangent = [\n' +
            '  points[idxB][0] - points[idxA][0],\n' +
            '  points[idxB][1] - points[idxA][1]\n' +
            '];\n' +
            'radiansToDegrees(Math.atan2(tangent[1], tangent[0]))';
        particleLayer.property("Rotation").expression = rotExpr;

        // Add expression for cycling along the path
        var expr = "" +
            "var marker = thisComp.layer('" + pathLayer.name + "').marker;\n" +
            "var arr = marker.key(1).comment.split('pathPoints:')[1].split(',');\n" +
            "var pts = [];\n" +
            "for (var j = 0; j < arr.length; j += 2) {\n" +
            "  pts.push([parseFloat(arr[j]), parseFloat(arr[j+1])]);\n" +
            "}\n" +
            "var n = " + numCopies + ";\n" +
            "var idx = " + i + ";\n" +
            "var dur = " + animationDuration + ";\n" +
            "var t = ((time/dur) + (idx/n)) % 1;\n" +
            "var p = t * (pts.length - 1);\n" +
            "var i0 = Math.floor(p);\n" +
            "var i1 = Math.ceil(p);\n" +
            "var frac = p - i0;\n" +
            "var pt0 = pts[i0];\n" +
            "var pt1 = pts[i1];\n" +
            "[\n  pt0[0] + (pt1[0]-pt0[0])*frac,\n  pt0[1] + (pt1[1]-pt0[1])*frac\n]";
        particleLayer.property("Transform").property("Position").expression = expr;

        // Parent particle to null (optional, can remove if not needed)
        // particleLayer.parent = nullLayer;
    }

    app.endUndoGroup();
    alert("Created " + numCopies + " null and particle pairs along the path.");
})();

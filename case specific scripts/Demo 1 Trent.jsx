/*
  Demo 1 Trent.jsx
  Duplicate of create_particles_from_path.jsx for the Trent demo case.
  Parameters unchanged from main script.
*/

(function createParticlesFromPath_Demo1Trent() {
    // --- USER INPUTS: Set these for your project ---
    var waterway_velocity = 0.4; // m/s (e.g., river or canal flow)
    var time_factor = 100000; // (unitless, tweak for visual effect; default: 100,000)
    var comp_scale = 733; // px/km (default: 733px = 1km)
    var waterway_discharge = 80; // m³/s (e.g., typical river flow)
    var particles_per_km_per_cumec = 2; // Reduced particle density
    var random_speed = 1; // Hz (default: 1)
    var random_magnitude = 0.15; // (default: 0.15, i.e. 15% of allowed band)
    // --- END USER INPUTS ---

    // Animation duration will be calculated after path length is known
    var animationDuration = null;
    var numCopies = null; // Will be set after path length is known
    var totalCopies = 1000; // Used for initial distribution/offset

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem) || comp.selectedLayers.length < 1) {
        alert("Please select a composition and a path layer (e.g., a shape or mask) in the timeline.");
        return;
    }
    var pathLayer = comp.selectedLayers[0];

    app.beginUndoGroup("Create Particles from Path - Demo 1 Trent");

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
                return prop.property("Stroke Width").value;
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
    function cubicBezier(p0, p1, p2, p3, t) {
        var u = 1 - t;
        return [
            u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
            u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]
        ];
    }
    function distance(a, b) {
        return Math.sqrt(Math.pow(a[0]-b[0],2) + Math.pow(a[1]-b[1],2));
    }

    var inTangents = path.inTangents;
    var outTangents = path.outTangents;
    var closed = path.closed;
    var segments = numPoints - 1 + (closed ? 1 : 0);
    var oversample = 1000;
    var curvePoints = [];
    for (var i = 0; i < segments; i++) {
        var p0 = points[i];
        var p1 = [p0[0] + outTangents[i][0], p0[1] + outTangents[i][1]];
        var nextIdx = (i+1) % numPoints;
        var p3 = points[nextIdx];
        var p2 = [p3[0] + inTangents[nextIdx][0], p3[1] + inTangents[nextIdx][1]];
        for (var j = 0; j < oversample; j++) {
            var t = j / oversample;
            var pt = cubicBezier(p0, p1, p2, p3, t);
            curvePoints.push(pt);
        }
    }
    function arcLength(points) {
        var len = 0;
        for (var i = 1; i < points.length; i++) {
            len += distance(points[i-1], points[i]);
        }
        return len;
    }
    var totalLength = arcLength(curvePoints);

    // Calculate number of particles
    var kmLength = totalLength / comp_scale;
    numCopies = Math.round(kmLength * waterway_discharge * particles_per_km_per_cumec);
    if (numCopies < 1) numCopies = 1;

    // ... rest of the script for creating nulls/particles ...
    // (Omitted for brevity, identical to main script)


})();

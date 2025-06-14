/*
  create_particles_from_path_debug.jsx
  Debug version of the particle creation script for After Effects ExtendScript.
  Adds detailed logging for path point handling and sampling.
*/

(function createParticlesFromPathDebug() {
    var log = '';
    function debug(msg) { log += msg + '\n'; }

    // --- USER INPUTS (as in original script) ---
    var waterway_velocity = 0.4;
    var time_factor = 100000;
    var comp_scale = 733;
    var waterway_discharge = 80;
    var particles_per_km_per_cumec = 2;
    var random_speed = 1;
    var random_magnitude = 0.15;
    // --- END USER INPUTS ---

    var animationDuration = null;
    var numCopies = null;
    var totalCopies = 1000;

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem) || comp.selectedLayers.length < 1) {
        alert("Please select a composition and a path layer (e.g., a shape or mask) in the timeline.");
        return;
    }
    var pathLayer = comp.selectedLayers[0];
    debug('Active comp: ' + comp.name);
    debug('Selected layer: ' + pathLayer.name + ' (' + pathLayer.matchName + ")");

    app.beginUndoGroup("Create Particles from Path - Debug");

    function findPathProperty(group) {
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            if (prop.matchName === "ADBE Vector Shape" || prop.matchName === "ADBE Mask Shape") {
                debug('Found Pen-drawn path: ' + prop.name + ' in group ' + group.name);
                return prop;
            } else if (prop.numProperties > 0) {
                var found = findPathProperty(prop);
                if (found) return found;
            }
        }
        return null;
    }

    var pathProperty = null;
    if (pathLayer.property("Masks") && pathLayer.property("Masks").numProperties > 0) {
        pathProperty = pathLayer.property("Masks").property(1).property("maskPath");
        debug('Using mask path.');
    } else if (pathLayer.property("Contents")) {
        pathProperty = findPathProperty(pathLayer.property("Contents"));
        debug('Using shape path.');
    }
    if (!pathProperty) {
        alert("No suitable path found in the selected layer.");
        return;
    }
    debug('Path property found: ' + pathProperty.name);

    var path = pathProperty.value;
    var numPoints = path.vertices.length;
    debug('Number of path points: ' + numPoints);
    debug('Closed: ' + path.closed);
    debug('inTangents: ' + JSON.stringify(path.inTangents));
    debug('outTangents: ' + JSON.stringify(path.outTangents));
    debug('Vertices: ' + JSON.stringify(path.vertices));

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

    var oversample = 1000;
    var curvePoints = [];
    var arcLengths = [0];
    var totalLength = 0;
    var inTangents = path.inTangents;
    var outTangents = path.outTangents;
    var vertices = path.vertices;
    var closed = path.closed;
    var segments = numPoints - 1 + (closed ? 1 : 0);
    debug('Segments: ' + segments);

    for (var i = 0; i < segments; i++) {
        var p0 = vertices[i];
        var p1 = [p0[0] + outTangents[i][0], p0[1] + outTangents[i][1]];
        var nextIdx = (i+1) % numPoints;
        var p3 = vertices[nextIdx];
        var p2 = [p3[0] + inTangents[nextIdx][0], p3[1] + inTangents[nextIdx][1]];
        for (var j = 0; j < oversample; j++) {
            var t = j / oversample;
            var pt = cubicBezier(p0, p1, p2, p3, t);
            curvePoints.push(pt);
            if (curvePoints.length > 1) {
                var len = distance(curvePoints[curvePoints.length-2], pt);
                arcLengths.push(arcLengths[arcLengths.length-1] + len);
            }
        }
    }
    totalLength = arcLengths[arcLengths.length-1];
    debug('Total path length: ' + totalLength.toFixed(2) + ' px');
    debug('Oversampled curve points: ' + curvePoints.length);
    debug('Arc lengths: ' + arcLengths.slice(0, Math.min(10, arcLengths.length)).join(', ') + (arcLengths.length > 10 ? ', ...' : ''));

    // Calculate number of particles
    var kmLength = totalLength / comp_scale;
    numCopies = Math.round(kmLength * waterway_discharge * particles_per_km_per_cumec);
    debug('Calculated km length: ' + kmLength.toFixed(3));
    debug('Calculated numCopies: ' + numCopies);

    app.endUndoGroup();
    alert(log);
})();

/*
  create_particles_from_path_debug2.jsx
  DEBUG VERSION: Adds alerts/logs after path detection and inside the null/particle creation loop.
  Usage: Select your shape layer and run this script from File > Scripts > Run Script File...
*/

(function createParticlesFromPathDebug2() {
    var debugLog = '';
    function log(msg) { debugLog += msg + '\n'; }

    // --- USER INPUTS: Set these for your project ---
    var waterway_velocity = 0.4;
    var time_factor = 100000;
    var comp_scale = 733;
    var waterway_discharge = 80;
    var particles_per_km_per_cumec = 2;
    var random_speed = 1;
    var random_magnitude = 0.15;
    // --- END USER INPUTS ---

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert('No active composition found.');
        return;
    }
    log('Active comp: ' + comp.name);

    if (comp.selectedLayers.length < 1) {
        alert('No layer selected.');
        return;
    }
    var pathLayer = comp.selectedLayers[0];
    log('Selected layer: ' + pathLayer.name + ' (' + pathLayer.matchName + ')');

    app.beginUndoGroup('Create Particles from Path (Debug2)');

    function findPathProperty(group) {
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            if (prop.matchName === 'ADBE Vector Shape') {
                log('Found Pen-drawn path: ' + prop.name + ' in group ' + group.name);
                return prop;
            } else if (prop.numProperties && prop.numProperties > 0) {
                var found = findPathProperty(prop);
                if (found) return found;
            }
        }
        return null;
    }

    var pathProperty = null;
    if (pathLayer.property('Masks') && pathLayer.property('Masks').numProperties > 0) {
        pathProperty = pathLayer.property('Masks').property(1).property('maskPath');
        log('Using mask path.');
    } else if (pathLayer.property('Contents')) {
        pathProperty = findPathProperty(pathLayer.property('Contents'));
        log('Using shape path.');
    }
    if (!pathProperty) {
        alert('Could not find a path (mask or shape) on the selected layer.');
        return;
    }
    log('Path property found: ' + pathProperty.name);

    var path = pathProperty.value;
    var points = path.vertices;
    log('Number of path points: ' + (points ? points.length : 'undefined'));
    if (!points || points.length < 2) {
        alert('Path has too few points.');
        return;
    }

    // Calculate path length (sum of segment lengths)
    var pathLength = 0;
    for (var i = 1; i < points.length; i++) {
        var dx = points[i][0] - points[i-1][0];
        var dy = points[i][1] - points[i-1][1];
        pathLength += Math.sqrt(dx*dx + dy*dy);
    }
    log('Path length (px): ' + pathLength);

    // Estimate animation duration and numCopies
    var animationDuration = (pathLength / comp_scale) / waterway_velocity;
    var numCopies = Math.round((pathLength / comp_scale) * waterway_discharge * particles_per_km_per_cumec);
    log('animationDuration: ' + animationDuration);
    log('numCopies: ' + numCopies);
    alert('DEBUG: animationDuration=' + animationDuration + ', numCopies=' + numCopies);

    if (!numCopies || numCopies < 1) {
        alert('No particles/nulls to create (numCopies=' + numCopies + '). Check your user input values and path.');
        return;
    }

    // Try to create the first 3 nulls/particles for debug
    for (var i = 0; i < Math.min(numCopies, 3); i++) {
        try {
            var nullLayer = comp.layers.addNull(10);
            nullLayer.name = 'Debug Null ' + (i+1);
            log('Created null layer #' + (i+1));
            nullLayer.remove();
            log('Removed null layer #' + (i+1));
        } catch (e) {
            log('Error creating/removing null layer #' + (i+1) + ': ' + e.toString());
        }
    }

    alert('DEBUG LOG:\n\n' + debugLog);
    app.endUndoGroup();
})();

/*
  create_particles_from_path_debug.jsx
  DEBUG VERSION: Logs and alerts key steps and values for troubleshooting.
  Usage: Select your shape layer and run this script from File > Scripts > Run Script File...
*/

(function createParticlesFromPathDebug() {
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

    app.beginUndoGroup('Create Particles from Path (Debug)');

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

    // Dummy test: Try to add a null layer to comp
    try {
        var testNull = comp.layers.addNull(10);
        testNull.name = 'Debug Null';
        log('Added test null layer.');
        testNull.remove();
        log('Removed test null layer.');
    } catch (e) {
        log('Error adding/removing test null: ' + e.toString());
    }

    // At end, show debug log
    alert('DEBUG LOG:\n\n' + debugLog);
    app.endUndoGroup();
})();

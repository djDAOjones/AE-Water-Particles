/*
  Demo 1 Leen Canal.jsx
  Duplicate of create_particles_from_path.jsx for the Leen Canal demo case.
  Parameters: waterway_velocity = 1, waterway_discharge = 0.7
*/

(function createParticlesFromPath_Demo1LeenCanal() {
    // --- USER INPUTS: Set these for your project ---
    var waterway_velocity = 1; // m/s (Leen Canal)
    var time_factor = 100000; // (unitless, tweak for visual effect; default: 100,000)
    var comp_scale = 733; // px/km (default: 733px = 1km)
    var waterway_discharge = 0.7; // m³/s (Leen Canal)
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

    app.beginUndoGroup("Create Particles from Path - Demo 1 Leen Canal");

    // ... (rest of script identical to main) ...

})();

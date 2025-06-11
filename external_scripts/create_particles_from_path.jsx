/*
  create_particles_from_path.jsx
  After Effects ExtendScript to automate creation of null and particle layers along a path.
  User-configurable: animation duration, number of copies.
  
  Usage: Run from File > Scripts > Run Script File...
*/

(function createParticlesFromPath() {
    // Prompt user for main variables
    // Hardcoded for testing
    var animationDuration = 2;
    var numCopies = 10;

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

    // Bake path points in comp space as [x, y] pairs
    var compPoints = [];
    for (var p = 0; p < numPoints; p++) {
        compPoints.push([
            points[p][0] + groupPosition[0] + layerPosition[0],
            points[p][1] + groupPosition[1] + layerPosition[1]
        ]);
    }
    // Store as a marker comment on the path layer (comma-separated)
    var flatCompPoints = [];
    for (var q = 0; q < compPoints.length; q++) {
        flatCompPoints.push(compPoints[q][0], compPoints[q][1]);
    }
    pathLayer.property("Marker").setValueAtTime(0, new MarkerValue("pathPoints:" + flatCompPoints.join(",")));

    // Create null and particle layers at intervals along the path
    for (var i = 0; i < numCopies; i++) {
        var t = i / numCopies; // offset for cycling
        var idx = Math.floor(t * (compPoints.length - 1));
        idx = Math.max(0, Math.min(idx, compPoints.length - 1)); // Ensure in-bounds
        var pos = compPoints[idx];
        if (!pos || pos.length !== 2 || isNaN(pos[0]) || isNaN(pos[1])) {
            alert("Invalid position at idx " + idx + ": " + pos);
            continue;
        }

        // Create Null
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "Particle Null " + (i + 1);
        nullLayer.property("Position").setValue([pos[0], pos[1]]);
        nullLayer.inPoint = 0;
        nullLayer.outPoint = animationDuration;

        // Create Particle as a shape layer (ellipse, 20px, filled #00D0FF)
        var particleLayer = comp.layers.addShape();
        particleLayer.name = "Particle " + (i + 1);
        particleLayer.inPoint = 0;
        particleLayer.outPoint = animationDuration;

        // Add ellipse
        var contents = particleLayer.property("Contents");
        var ellipseGroup = contents.addProperty("ADBE Vector Group");
        ellipseGroup.name = "Ellipse 1";
        var ellipse = ellipseGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
        ellipse.property("Size").setValue([20, 20]);
        // Add fill
        var fill = ellipseGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue([0/255, 208/255, 255/255]);

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

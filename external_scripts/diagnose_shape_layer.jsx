/*
  diagnose_shape_layer.jsx
  Utility script for After Effects to diagnose the structure of a selected shape layer.
  - Lists all shape groups and paths
  - Reports if a Pen-drawn (Bezier) path is found (ADBE Vector Shape)
  - Helps debug why a layer is not working with automation scripts

  Usage: Select a shape layer in your comp, then run this script from File > Scripts > Run Script File...
*/

(function diagnoseShapeLayer() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem) || comp.selectedLayers.length < 1) {
        alert("Please select a shape layer in your comp.");
        return;
    }
    var layer = comp.selectedLayers[0];
    if (!(layer.property("Contents"))) {
        alert("Selected layer is not a shape layer.");
        return;
    }

    function describeGroup(group, prefix) {
        var report = '';
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            var name = prop.name;
            var matchName = prop.matchName;
            report += prefix + '- ' + name + ' (' + matchName + ')\n';
            // Recursively check subgroups
            if (prop.numProperties && prop.numProperties > 0) {
                report += describeGroup(prop, prefix + '  ');
            }
        }
        return report;
    }

    // Look for Pen-drawn (Bezier) path
    function findPenPath(group) {
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            if (prop.matchName === "ADBE Vector Shape") {
                return prop;
            } else if (prop.numProperties && prop.numProperties > 0) {
                var found = findPenPath(prop);
                if (found) return found;
            }
        }
        return null;
    }

    var contents = layer.property("Contents");
    var structure = describeGroup(contents, '');
    var penPath = findPenPath(contents);

    var lines = structure.split('\n');
    var pageSize = 20;
    var pageCount = Math.ceil(lines.length / pageSize);
    for (var p = 0; p < pageCount; p++) {
        var chunk = lines.slice(p * pageSize, (p + 1) * pageSize).join('\n');
        if (p === pageCount - 1) {
            // Last page, add summary
            if (penPath) {
                chunk += "\n\u2705 Pen-drawn (Bezier) path found: '" + penPath.name + "' in group '" + penPath.parentProperty.parentProperty.name + "'.";
            } else {
                chunk += "\n\u26A0\uFE0F No Pen-drawn (Bezier) path (ADBE Vector Shape) found.\n\n" +
                         "Tips:\n- Use the Pen tool to draw a path.\n- Convert primitives (Ellipse, Rectangle, Star) to Bezier path by right-clicking and choosing 'Convert To Bezier Path'.\n- Only Pen-drawn paths are supported by the automation script.";
            }
        }
        alert("Shape Layer Structure (" + (p + 1) + "/" + pageCount + "):\n\n" + chunk);
    }
})();

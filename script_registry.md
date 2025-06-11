# Script Registry

Track all scripts (internal and external), their locations, purposes, and status. Update this as you add or modify scripts.

## Particle Path-Following Position Expression

```javascript
// --- Path-following with smooth random wiggle (perpendicular) ---
// 1. Read baked path points from marker
var marker = thisComp.layer("<PATH_LAYER_NAME>").marker.key(1).comment;
var arr = marker.match(/pathPoints:([\d\.,-]+)/)[1].split(",").map(parseFloat);
var points = [];
for (var i = 0; i < arr.length; i += 2) points.push([arr[i], arr[i+1]]);

// 2. Animation progress (0–1)
var duration = 2; // Match your script's value or link to a control
var offset = (index - 1) / thisComp.numLayers; // or however you offset particles
var t = (time/duration + offset) % 1;

// 3. Interpolate position along path
var posIdx = t * (points.length - 1);
var idxA = Math.floor(posIdx);
var idxB = Math.min(idxA + 1, points.length - 1);
var frac = posIdx - idxA;
var pos = [
  points[idxA][0] + (points[idxB][0] - points[idxA][0]) * frac,
  points[idxA][1] + (points[idxB][1] - points[idxA][1]) * frac
];

// 4. Perpendicular smooth random wiggle
seedRandom(index, true);
var amp = random(3, 8);         // Amplitude: tweak to taste
var freq = random(0.1, 0.3);    // Frequency: tweak to taste
var phase = random(0, Math.PI*2);
var wiggle = Math.sin(time * freq * 2 * Math.PI + phase) * amp;

// 5. Tangent and perpendicular at this position
var tangent = [
  points[idxB][0] - points[idxA][0],
  points[idxB][1] - points[idxA][1]
];
var norm = Math.sqrt(tangent[0]*tangent[0] + tangent[1]*tangent[1]);
var perp = [-tangent[1]/norm, tangent[0]/norm];

// 6. Final position (path + perpendicular wiggle)
[pos[0] + perp[0]*wiggle, pos[1] + perp[1]*wiggle]
```

## Particle Path-Following Rotation Expression

```javascript
// --- Orient particle to path direction ---
var marker = thisComp.layer("<PATH_LAYER_NAME>").marker.key(1).comment;
var arr = marker.match(/pathPoints:([\d\.,-]+)/)[1].split(",").map(parseFloat);
var points = [];
for (var i = 0; i < arr.length; i += 2) points.push([arr[i], arr[i+1]]);

var duration = 2;
var offset = (index - 1) / thisComp.numLayers;
var t = (time/duration + offset) % 1;

var posIdx = t * (points.length - 1);
var idxA = Math.floor(posIdx);
var idxB = Math.min(idxA + 1, points.length - 1);
var tangent = [
  points[idxB][0] - points[idxA][0],
  points[idxB][1] - points[idxA][1]
];
radiansToDegrees(Math.atan2(tangent[1], tangent[0]))
```

| Script Name         | Type      | Location in Project            | Purpose/Feature             | Status     |
|---------------------|-----------|-------------------------------|-----------------------------|------------|

- **Internal**: Expressions or scripts inside AE project files (note comp/layer/effect).
- **External**: Standalone `.jsx` or JavaScript files run via ExtendScript or Node.js.

Add new entries as you create scripts.

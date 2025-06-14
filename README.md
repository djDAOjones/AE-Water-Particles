# After Effects Particle Automation

This project helps automate the creation and management of particle and null layers in Adobe After Effects using both internal and external JavaScript scripting. It tracks where scripts are located, their purposes, and provides a feature-driven project plan for organized development.

## Structure

- `internal_scripts/` — Scripts and expressions embedded within the AE project (with notes on their comp/layer locations)
- `external_scripts/` — Scripts run outside AE (e.g., ExtendScript, Node.js automation)
- `project_plan.md` — High-level plan and feature tracking
- `script_registry.md` — Log of all scripts, locations, and purposes

## Workflow

1. Use the project plan to implement features one at a time.
2. Register every script (internal/external) in `script_registry.md`.
3. Update documentation as features and scripts evolve.

---

## Illustrator to After Effects Path Workflow
- Only standard vector paths (Pen-drawn/Bezier, not compound paths, groups, or primitives) are supported by the main automation script.
- **In Illustrator:**
    - If your shape is a rectangle, ellipse, or star: Select it, then go to Object > Shape > Expand Shape (or right-click and choose 'Convert to Path').
    - If your path is a compound path: Select it, then go to Object > Compound Path > Release.
    - If your object is grouped: Select it, then go to Object > Ungroup.
    - Use the Direct Selection Tool (white arrow) to select the specific path you want.
    - Copy (Cmd+C).
- **In After Effects:**
    - Create a new Shape Layer, use Add > Path, select 'Path 1', and Paste (Cmd+V).
    - Do NOT paste into Ellipse/Rectangle/Star Path or Mask unless you intend to use masks (which are also supported).
    - After pasting, ensure you see 'Path 1' under Contents > Shape 1 in your shape layer.
    - The script will use the first mask path or the first Pen-drawn (Bezier) shape path it finds in the selected layer.

## Getting Started

- Place internal scripts/expressions in `internal_scripts/` and note their AE locations.
- Place external scripts in `external_scripts/`.
- Update `project_plan.md` and `script_registry.md` as you work.

---

For questions or help with scripting, see the documentation or ask your AI assistant.

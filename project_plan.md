# Project Plan: After Effects Particle Automation

Track features, tasks, and progress for your AE scripting project. Check off tasks as you complete them and add notes as needed.

## Features & Tasks

- **Dev 10% Layer Preview:** For development efficiency, the script can be set to only create 10% of the intended layers (e.g. 100 out of 1000), but calculates offsets and positions as if all layers exist. This allows for fast previewing of dense particle arrangements without overwhelming After Effects.

- **Even Speed Along Path:**
    - [x] Implemented arc-length-based resampling of the Bezier path, so particles now move at a consistent speed along the entire curve. (Uses oversampling and arc-length lookup for true even spacing.)
    - [ ] Randomness in the expression is still not working as intended—particles currently follow the path without visible random motion.
- [x] **Create Null and Particle Layers Based on a Path**
  - [x] Script to generate null/particle layers from a path
  - [x] Expose variables: animation duration, number of copies
    - Particle is now a 20px ellipse shape layer with fill color #00D0FF, positioned accurately along the path.
- [ ] **Apply Parenting to New Layers**
  - [ ] Automatically parent new layers as needed
- [x] **Offset Path Cycles for Duplicates**
  - [x] Particles now loop indefinitely and smoothly along the path using expressions. Each is evenly offset in time.

- [ ] **Evenly Space Path Vertices**
  - [ ] Evenly space vertices along the path so that the speed of particles is consistent throughout the animation.

- [ ] **Velocity-Based Animation Duration**
  - [ ] Allow user to specify particle velocity (in metres per second), and automatically derive animation duration from the calculated path length and speed.
- [ ] **Random Variance & Directionality for Particles**
  - [ ] Script to add randomness and directionality
- [ ] **Update Script References**
  - [ ] Ensure scripts reference new layers (not old ones, except where relevant)
- [ ] **Verify Path Copying**
  - [ ] Confirm layer paths are duplicated correctly
- [ ] **Further Features**
  - [ ] Add new features here as identified

## Milestones

- **MVP:**
  - Null/particle layer creation
  - Parenting
  - Path offsetting
- **Polish:**
  - Randomness
  - Script reference updates
  - Path verification
  - Documentation

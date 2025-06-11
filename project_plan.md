# Project Plan: After Effects Particle Automation

Track features, tasks, and progress for your AE scripting project. Check off tasks as you complete them and add notes as needed.

## Features & Tasks

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

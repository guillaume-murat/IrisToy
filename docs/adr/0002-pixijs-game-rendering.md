# Use PixiJS and Vite for 2D Rendering and Physics

## Context

The webcam party game requires 60 FPS rendering, layering over the live mirrored webcam feed, sprite animation, collision detection, and responsive physics for bouncing balls and interactive objects.

## Decision

We chose Vite with TypeScript and PixiJS for the game engine and rendering loop. PixiJS provides hardware-accelerated 2D WebGL rendering, efficient sprite batching, clean integration with canvas overlays, and an active ecosystem.

## Considered Options

- **Raw HTML5 Canvas 2D**: Rejected as collision handling, sprite management, and complex particle effects become cumbersome to maintain.
- **Three.js**: Rejected for the MVP 2D ball bounce mechanics to keep rendering overhead minimal while maintaining 60 FPS alongside vision inference.

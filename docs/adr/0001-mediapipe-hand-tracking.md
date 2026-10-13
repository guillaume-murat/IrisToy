# Use Google MediaPipe Tasks Vision for In-Browser Hand Tracking

## Context

The game requires real-time, low-latency detection of up to two hands with 21 landmarks each, directly in the player's web browser, with full privacy and no server-side video streaming.

## Decision

We chose Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision` HandLandmarker) running via WebAssembly and WebGL/WebGPU acceleration client-side.

## Considered Options

- **TensorFlow.js (HandPose)**: Rejected due to higher bundle weight, slower inference speed, and higher battery drain on mobile/laptops.
- **WebNN / Custom ONNX**: Rejected due to lack of uniform browser support across platforms.

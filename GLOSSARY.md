# IrisToy

A modern web-based webcam game inspired by classic camera party games, powered by real-time hand and gesture tracking.

## Language

### Vision & Tracking

**Hand Landmarker**:
The computer vision pipeline responsible for detecting hands and extracting 21 three-dimensional skeletal coordinates per hand in real-time.
_Avoid_: Pose estimator, body tracker, hand sensor

**Landmark**:
A normalized 3D point (x, y, z) representing a specific joint or fingertip on a detected hand.
_Avoid_: Keypoint, joint point, bone vertex

**Skeleton**:
The connected topological visual representation formed by lines joining the 21 landmarks of a detected hand.
_Avoid_: Mesh, wireframe, rig

**Mirror Feed**:
The horizontally flipped live webcam video stream presenting a mirror reflection to the player so physical movements match screen motion.
_Avoid_: Reverse camera, selfie mode, inverted stream

**Pose**:
A static configuration or shape of a detected hand at a given frame (e.g. Open Palm, Fist, Pinch).
_Avoid_: Gesture, stance, hand state

**Gesture**:
A dynamic movement of a hand evaluated across consecutive frames (e.g. Swipe, Hit / Punch).
_Avoid_: Pose, action, movement pattern

### Gameplay & Physics

**Ball**:
A dynamic physics-driven game entity subjected to gravity and screen boundaries that reacts to collisions with the player's hands.
_Avoid_: Sphere, projectile, bubble

**Bounce**:
An impulse collision event occurring when a tracked hand segment or landmark strikes the ball, altering its velocity vector and triggering audiovisual feedback.
_Avoid_: Hit, contact, tap

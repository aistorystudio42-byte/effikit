<!-- @keywords: three.js, threjs, 3d, webgl, scene, renderer, camera, mesh, geometry, material, canvas, r3f -->
<!-- @domain: Three.js — Setup & Core Concepts -->

# Three.js — Setup & Core Concepts

## What This Is

Three.js is the standard WebGL abstraction library for 3D in the browser. This guide covers both vanilla Three.js and React Three Fiber (R3F), the declarative React wrapper that's now the preferred approach for React projects.

**No MCP server needed** — Three.js runs in your project directly. Claude reads your code and the Three.js docs to help you build 3D experiences.

---

## Installation

### Vanilla Three.js

```bash
npm install three
npm install -D @types/three
```

### React Three Fiber (React projects)

```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

`@react-three/drei` is a collection of ready-made helpers — use it aggressively, it saves enormous amounts of boilerplate.

---

## The Three.js Core Architecture

Every Three.js scene needs exactly these four things:

```typescript
import * as THREE from 'three';

// 1. Scene — contains all 3D objects
const scene = new THREE.Scene();

// 2. Camera — defines the viewpoint
const camera = new THREE.PerspectiveCamera(
  75,                              // field of view (degrees)
  window.innerWidth / window.innerHeight, // aspect ratio
  0.1,                             // near clipping plane
  1000                             // far clipping plane
);
camera.position.z = 5;

// 3. Renderer — draws to canvas
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2x
document.body.appendChild(renderer.domElement);

// 4. Render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

---

## Core Object Hierarchy

```
Scene
└── Mesh
    ├── Geometry  (the shape — vertex positions, normals, UVs)
    └── Material  (the appearance — color, texture, shading)
```

**Creating a mesh:**
```typescript
const geometry = new THREE.BoxGeometry(1, 1, 1);  // width, height, depth
const material = new THREE.MeshStandardMaterial({ color: 0x6366f1 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
```

---

## Geometry Types

| Geometry | Constructor | Notes |
|---------|------------|-------|
| Box | `BoxGeometry(w, h, d)` | Most common |
| Sphere | `SphereGeometry(r, widthSeg, heightSeg)` | Use ≥32 segments for smooth look |
| Cylinder | `CylinderGeometry(rTop, rBot, h, seg)` | Both radii can differ (cone) |
| Plane | `PlaneGeometry(w, h)` | Flat surface, useful for ground |
| Torus | `TorusGeometry(r, tube, rSeg, tSeg)` | Donut shape |
| TorusKnot | `TorusKnotGeometry(r, tube, tSeg, rSeg, p, q)` | Complex knot |
| Custom | `BufferGeometry` | Build from vertices directly |

---

## Material Types

| Material | Use When |
|---------|---------|
| `MeshBasicMaterial` | No lighting, always visible — for UI elements or debugging |
| `MeshStandardMaterial` | PBR (physically based) — best general-purpose choice |
| `MeshPhysicalMaterial` | PBR + clearcoat, sheen, transmission — realistic glass/metal |
| `MeshNormalMaterial` | Debug normals — shows surface orientation as color |
| `MeshDepthMaterial` | Debug depth — used in post-processing |
| `ShaderMaterial` | Custom vertex + fragment shaders — maximum control |
| `PointsMaterial` | For `Points` (particle systems) |
| `LineBasicMaterial` | For `Line` objects |

---

## Lighting

Without lights, `MeshStandardMaterial` renders as black:

```typescript
// Ambient — flat, even lighting from all directions
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // color, intensity
scene.add(ambientLight);

// Directional — like sunlight, parallel rays
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

// Point — like a light bulb, radiates from a point
const pointLight = new THREE.PointLight(0x6366f1, 2, 10); // color, intensity, distance
pointLight.position.set(2, 3, 0);
scene.add(pointLight);

// Spot — cone-shaped beam
const spotLight = new THREE.SpotLight(0xffffff, 1, 20, Math.PI / 6);
scene.add(spotLight);
```

---

## React Three Fiber Setup

```tsx
// app/page.tsx — Next.js example
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

function Box() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  );
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      style={{ width: '100%', height: '100vh' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <Box />
      <OrbitControls />
      <Environment preset="city" />
    </Canvas>
  );
}
```

---

## Coordinate System

Three.js uses a right-handed coordinate system:
- X → right
- Y → up  
- Z → toward you (out of the screen)

```typescript
object.position.set(x, y, z);  // world position
object.rotation.set(x, y, z);  // Euler angles in radians
object.scale.set(x, y, z);     // scale factor

// Useful conversions
const degrees = 45;
const radians = degrees * (Math.PI / 180);  // or THREE.MathUtils.degToRad(45)
```

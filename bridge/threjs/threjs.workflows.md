<!-- @keywords: three.js, animation, physics, shader, texture, model, GLTF, orbit controls, post processing, particle system -->
<!-- @domain: Three.js — Workflows & Advanced Techniques -->

# Three.js — Workflows & Advanced Techniques

## Animation Patterns

### Basic Rotation Loop (Vanilla)

```typescript
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const elapsed = clock.getElapsedTime();  // total seconds since start
  
  cube.rotation.y = elapsed * 0.5;         // 0.5 rad/sec
  cube.rotation.x = Math.sin(elapsed) * 0.3; // oscillate on X
  
  renderer.render(scene, camera);
}
animate();
```

### useFrame in React Three Fiber

```tsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';

function AnimatedBox() {
  const meshRef = useRef<Mesh>(null!);
  
  useFrame((state, delta) => {
    // delta = seconds since last frame (frame-rate independent)
    meshRef.current.rotation.y += delta * 0.5;
    
    // state.clock.elapsedTime for oscillations
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.3;
  });
  
  return (
    <mesh ref={meshRef}>
      <boxGeometry />
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  );
}
```

---

## Loading 3D Models (GLTF/GLB)

GLTF is the standard format. Use GLB (binary GLTF) for smaller file sizes.

### Vanilla Three.js

```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/'); // download draco decoder to public/draco/

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load('/models/scene.glb', (gltf) => {
  scene.add(gltf.scene);
  
  // Play animation if present
  const mixer = new THREE.AnimationMixer(gltf.scene);
  if (gltf.animations.length > 0) {
    mixer.clipAction(gltf.animations[0]).play();
  }
});
```

### React Three Fiber with useGLTF

```tsx
import { useGLTF } from '@react-three/drei';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// Preload to avoid waterfall
useGLTF.preload('/models/scene.glb');
```

---

## Texture Loading

```typescript
const textureLoader = new THREE.TextureLoader();

// Load a single texture
const colorMap = textureLoader.load('/textures/wood/color.jpg');
const normalMap = textureLoader.load('/textures/wood/normal.jpg');
const roughnessMap = textureLoader.load('/textures/wood/roughness.jpg');
const aoMap = textureLoader.load('/textures/wood/ao.jpg');

const material = new THREE.MeshStandardMaterial({
  map: colorMap,
  normalMap: normalMap,
  roughnessMap: roughnessMap,
  aoMap: aoMap,
  roughness: 0.8,
  metalness: 0.1,
});
```

```tsx
// R3F with useTexture (parallel loading)
import { useTexture } from '@react-three/drei';

function WoodSurface() {
  const [color, normal, roughness] = useTexture([
    '/textures/wood/color.jpg',
    '/textures/wood/normal.jpg',
    '/textures/wood/roughness.jpg',
  ]);
  
  return (
    <mesh>
      <planeGeometry args={[5, 5]} />
      <meshStandardMaterial map={color} normalMap={normal} roughnessMap={roughness} />
    </mesh>
  );
}
```

---

## Physics Integration (Rapier)

```bash
npm install @react-three/rapier
```

```tsx
import { Physics, RigidBody } from '@react-three/rapier';

function PhysicsScene() {
  return (
    <Physics gravity={[0, -9.81, 0]}>
      {/* Floor */}
      <RigidBody type="fixed">
        <mesh>
          <boxGeometry args={[20, 0.5, 20]} />
          <meshStandardMaterial color="#aaaaaa" />
        </mesh>
      </RigidBody>
      
      {/* Falling box */}
      <RigidBody>
        <mesh position={[0, 5, 0]}>
          <boxGeometry />
          <meshStandardMaterial color="#6366f1" />
        </mesh>
      </RigidBody>
      
      {/* Sphere with restitution (bounciness) */}
      <RigidBody restitution={0.7}>
        <mesh position={[1, 8, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
      </RigidBody>
    </Physics>
  );
}
```

---

## Particle Systems

```typescript
// Create 10,000 particles
const count = 10000;
const geometry = new THREE.BufferGeometry();

const positions = new Float32Array(count * 3); // x, y, z per particle
for (let i = 0; i < count * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 20; // random in -10 to +10
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({
  size: 0.02,
  sizeAttenuation: true, // particles far away appear smaller
  color: 0x6366f1,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);
```

---

## Custom Shaders

```tsx
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const WaveMaterial = shaderMaterial(
  { time: 0, color: new THREE.Color(0.1, 0.3, 1.0) },
  // Vertex shader
  `
    uniform float time;
    void main() {
      vec3 pos = position;
      pos.y += sin(pos.x * 2.0 + time) * 0.1;  // wave
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform vec3 color;
    void main() {
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ WaveMaterial });

function WavePlane() {
  const matRef = useRef<any>();
  
  useFrame(({ clock }) => {
    matRef.current.time = clock.elapsedTime;
  });
  
  return (
    <mesh>
      <planeGeometry args={[5, 5, 64, 64]} />
      {/* @ts-ignore — extended material */}
      <waveMaterial ref={matRef} />
    </mesh>
  );
}
```

---

## Post-Processing

```bash
npm install @react-three/postprocessing
```

```tsx
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';

function Scene() {
  return (
    <>
      <Canvas>
        {/* ... scene objects ... */}
        <EffectComposer>
          <Bloom 
            intensity={1.5}
            luminanceThreshold={0.9}  // only bright parts bloom
            luminanceSmoothing={0.025}
          />
          <ChromaticAberration offset={[0.001, 0.001]} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </>
  );
}
```

---

## Camera Controls

```tsx
import { OrbitControls, FlyControls, PointerLockControls } from '@react-three/drei';

// Orbit — rotate around a target (most common)
<OrbitControls 
  enableZoom={true}
  enablePan={false}        // disable panning for product viewers
  minDistance={2}
  maxDistance={20}
  maxPolarAngle={Math.PI / 2}  // prevent going below ground
/>

// Fly — WASD camera movement
<FlyControls movementSpeed={5} rollSpeed={0.3} />

// FPS-style pointer lock
<PointerLockControls />
```

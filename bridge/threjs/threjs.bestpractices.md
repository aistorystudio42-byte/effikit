<!-- @keywords: three.js, performance, optimization, dispose, memory, draw calls, instancing, LOD, frustum culling -->
<!-- @domain: Three.js — Performance & Best Practices -->

# Three.js — Performance & Best Practices

## The Golden Performance Rules

1. **Minimize draw calls** — fewer separate objects is always better
2. **Dispose everything you no longer need** — Three.js leaks GPU memory if you don't
3. **Reuse geometries and materials** — don't create duplicates
4. **Cap pixel ratio at 2** — going above 2 gives no visible benefit
5. **Profile before optimizing** — don't guess

---

## GPU Memory Management

This is the #1 source of Three.js memory leaks:

```typescript
// ❌ Leak — geometry and material allocated on GPU, never freed
function createTempObject() {
  const geo = new THREE.BoxGeometry();
  const mat = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

// ✅ Always dispose when done
function removeObject(mesh: THREE.Mesh) {
  scene.remove(mesh);
  mesh.geometry.dispose();
  
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach(m => m.dispose());
  } else {
    mesh.material.dispose();
  }
}

// ✅ For textures
texture.dispose();

// ✅ For render targets
renderTarget.dispose();
```

In React Three Fiber, R3F handles disposal automatically when components unmount — but only for JSX-declared resources. Imperatively created resources still need manual disposal.

---

## Reuse Geometries and Materials

```typescript
// ❌ Creates 100 separate geometry + material allocations
for (let i = 0; i < 100; i++) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x6366f1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(i * 2, 0, 0);
  scene.add(mesh);
}

// ✅ One geometry, one material, 100 meshes share them
const sharedGeo = new THREE.BoxGeometry(1, 1, 1);
const sharedMat = new THREE.MeshStandardMaterial({ color: 0x6366f1 });

for (let i = 0; i < 100; i++) {
  const mesh = new THREE.Mesh(sharedGeo, sharedMat); // same refs
  mesh.position.set(i * 2, 0, 0);
  scene.add(mesh);
}
```

---

## Instancing — Thousands of Identical Objects

For 100+ identical objects, use `InstancedMesh` — single draw call for all:

```typescript
const count = 1000;
const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const material = new THREE.MeshStandardMaterial({ color: 0x6366f1 });

const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

const matrix = new THREE.Matrix4();
for (let i = 0; i < count; i++) {
  matrix.setPosition(
    (Math.random() - 0.5) * 50,
    (Math.random() - 0.5) * 50,
    (Math.random() - 0.5) * 50
  );
  instancedMesh.setMatrixAt(i, matrix);
}

instancedMesh.instanceMatrix.needsUpdate = true;
scene.add(instancedMesh);
```

R3F equivalent:
```tsx
import { Instances, Instance } from '@react-three/drei';

<Instances limit={1000}>
  <boxGeometry args={[0.5, 0.5, 0.5]} />
  <meshStandardMaterial color="#6366f1" />
  {positions.map((pos, i) => (
    <Instance key={i} position={pos} />
  ))}
</Instances>
```

---

## Level of Detail (LOD)

Show simpler meshes when objects are far away:

```typescript
const lod = new THREE.LOD();

// High detail — close up
const highGeo = new THREE.SphereGeometry(1, 64, 64);
lod.addLevel(new THREE.Mesh(highGeo, material), 0);   // distance 0

// Medium detail
const medGeo = new THREE.SphereGeometry(1, 16, 16);
lod.addLevel(new THREE.Mesh(medGeo, material), 10);  // distance 10

// Low detail
const lowGeo = new THREE.SphereGeometry(1, 4, 4);
lod.addLevel(new THREE.Mesh(lowGeo, material), 30);  // distance 30

scene.add(lod);

// Update LOD in the render loop
function animate() {
  requestAnimationFrame(animate);
  lod.update(camera); // ← required
  renderer.render(scene, camera);
}
```

---

## Render Performance

```typescript
// Cap pixel ratio — DPR > 2 is wasteful
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Enable shadow maps only when needed — expensive
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // nicer than default

// Only specific objects cast/receive shadows
dirLight.castShadow = true;
groundMesh.receiveShadow = true;
characterMesh.castShadow = true;

// Frustum culling (on by default) — don't disable it
mesh.frustumCulled = true;

// Avoid rendering when nothing changed (on-demand rendering)
renderer.render(scene, camera); // only when user interacts or something animates
```

---

## Performance Debugging

```typescript
// Import Stats.js
import Stats from 'three/examples/jsm/libs/stats.module';

const stats = new Stats();
document.body.appendChild(stats.dom);

function animate() {
  stats.begin();
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(animate);
}
```

In R3F:
```tsx
import { Perf } from 'r3f-perf'; // npm install r3f-perf

<Canvas>
  <Perf position="top-left" />
</Canvas>
```

**Targets:**
- FPS: ≥60 on desktop, ≥30 on mobile
- Memory: watch for continuous growth (indicates disposal leak)
- Draw calls: ideally <100, definitely <1000

---

## Common Mistakes

| Mistake | Effect | Fix |
|---------|--------|-----|
| Not disposing geometries/materials | GPU memory leak, crash after time | Always dispose on removal |
| Creating new objects in render loop | GC pressure, stuttering | Allocate once, reuse |
| Full-resolution shadow maps | Huge GPU cost | Limit `mapSize` to 1024×1024 |
| Too many point lights | Each light doubles shadow cost | Use 1-2 lights + ambient |
| Loading textures > 2048px | Slow load, high VRAM | Resize to power-of-two ≤2048px |
| Using `MeshPhongMaterial` | Legacy — not PBR | Use `MeshStandardMaterial` |
| Missing `needsUpdate = true` | Changes don't appear | Set on bufferAttribute after update |

---

## Ask Claude to Audit

```
Review my Three.js scene code and check for:
1. Memory leaks (objects not disposed on component unmount)
2. Objects created inside the render loop (should be outside)
3. Opportunities to use InstancedMesh
4. Unnecessary shadow casters/receivers
5. Missing frustum culling overrides

[paste your scene code]
```

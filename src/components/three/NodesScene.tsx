"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import { Dust } from "./Points";
import Postfx from "./Postfx";
import { beamFragment, beamVertex, fresnelFragment, fresnelVertex } from "./fx";
import { clamp, damp, easeInOutCubic, seg } from "./math";
import { nodesState } from "./progress";
import { pointer } from "./pointer";
import { haloTexture } from "./textures";
import { useQualitySettings } from "@/hooks/useQuality";

const NODE_COLORS = ["#d4a373", "#e6a4b8", "#ffc4a0", "#bfe0c2"];

/**
 * Where each node starts, in normalised screen space (-1..1), so the scattered
 * layout always fits the viewport and stays clear of the copy on the left.
 * [x, y, z]
 */
const SCATTER_WIDE: [number, number, number][] = [
  [0.12, 0.62, -1.6],
  [0.86, 0.5, -2.2],
  [0.22, -0.5, 1.2],
  [0.84, -0.62, 0.6],
];
const SCATTER_NARROW: [number, number, number][] = [
  [-0.6, -0.2, -1.2],
  [0.62, -0.16, -2],
  [-0.5, -0.55, 1],
  [0.56, -0.58, 0.4],
];
const UNIFIED: [number, number, number][] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
].map(([x, y, z]) => [x * 1.1, y * 1.1, z * 1.1]) as [number, number, number][];

const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

function Node({ index, groupRef }: { index: number; groupRef: (g: THREE.Group | null) => void }) {
  const color = NODE_COLORS[index];
  const fresnel = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fresnelVertex,
        fragmentShader: fresnelFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: 2.2 }, uStrength: { value: 0.95 } },
      }),
    [color],
  );
  const halo = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: haloTexture(),
        color: new THREE.Color(color).multiplyScalar(1.4),
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [color],
  );
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.46, 24, 24]} />
        <meshStandardMaterial color="#2a1c13" emissive={color} emissiveIntensity={0.9} roughness={0.15} metalness={0.2} envMapIntensity={1} transparent opacity={0.92} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      <mesh material={fresnel} scale={1.22}>
        <sphereGeometry args={[0.46, 32, 32]} />
      </mesh>
      <sprite material={halo} scale={2.5} />
    </group>
  );
}

function Beam({ a, b, seed, getOpacity }: { a: () => THREE.Vector3; b: () => THREE.Vector3; seed: number; getOpacity: () => number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uSeed: { value: seed },
          uColorA: { value: new THREE.Color("#d4a373") },
          uColorB: { value: new THREE.Color("#ffc4a0") },
        },
      }),
    [seed],
  );
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const pa = a();
    const pb = b();
    dir.subVectors(pb, pa);
    const len = dir.length();
    m.position.copy(pa).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(up, dir.normalize());
    m.scale.set(1, Math.max(len, 0.001), 1);
    const o = getOpacity();
    m.visible = o > 0.01;
    material.uniforms.uOpacity.value = o;
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={mesh} material={material} visible={false}>
      <cylinderGeometry args={[0.028, 0.028, 1, 8, 1, true]} />
    </mesh>
  );
}

function NodesWorld() {
  const { quality, ambient } = useQualitySettings();
  const still = quality === "static";
  const rig = useRef<THREE.Group>(null);
  const nodes = useRef<(THREE.Group | null)[]>([]);
  const shell = useRef<THREE.Mesh>(null);
  const st = useRef({ t: 0, px: 0, py: 0, p: still ? 1 : 0 });
  const positions = useMemo(() => UNIFIED.map(() => new THREE.Vector3()), []);
  const proj = useMemo(() => new THREE.Vector3(), []);

  const shellMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.50, 1.05, 0.63),
        wireframe: true,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    [],
  );
  const coreHalo = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: haloTexture(),
        color: new THREE.Color(1.50, 1.08, 0.75),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    if (still) nodesState.p = 1;
  }, [still]);

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.1);
    const s = st.current;
    s.t += dt;
    s.px = damp(s.px, pointer.active ? pointer.x : 0, 2.5, dt);
    s.py = damp(s.py, pointer.active ? pointer.y : 0, 2.5, dt);
    s.p = damp(s.p, still ? 1 : nodesState.p, 6, dt);
    const e = easeInOutCubic(seg(s.p, 0.04, 0.82));
    const { viewport, size } = state;
    const wide = size.width >= 900;
    const scale = clamp(viewport.width / (wide ? 12.5 : 8.5), 0.5, 1.15);

    const rg = rig.current;
    if (rg) {
      rg.scale.setScalar(scale);
      rg.position.set(wide ? viewport.width * 0.17 : 0, wide ? 0.1 : -viewport.height * 0.19, 0);
      rg.rotation.y = s.px * 0.25 + s.t * 0.05 * e;
      rg.rotation.x = -s.py * 0.15;
    }

    const scatter = wide ? SCATTER_WIDE : SCATTER_NARROW;
    const rx = rg ? rg.position.x : 0;
    const ry = rg ? rg.position.y : 0;
    scatter.forEach((n, i) => {
      const from: [number, number, number] = [
        (n[0] * viewport.width * 0.5 - rx) / scale,
        (n[1] * viewport.height * 0.5 - ry) / scale,
        n[2],
      ];
      const to = UNIFIED[i];
      const g = nodes.current[i];
      if (!g) return;
      const f = 1 - e;
      const wob = still ? 0 : 1;
      const x = from[0] + (to[0] - from[0]) * e + Math.sin(s.t * 0.7 + i * 2) * 0.35 * f * wob + Math.sin(s.t * 1.3 + i) * 0.05 * wob;
      const y = from[1] + (to[1] - from[1]) * e + Math.cos(s.t * 0.6 + i * 1.3) * 0.4 * f * wob + Math.cos(s.t * 1.1 + i) * 0.05 * wob;
      const z = from[2] + (to[2] - from[2]) * e;
      g.position.set(x, y, z);
      g.scale.setScalar(0.82 + e * 0.28);
      positions[i].set(x, y, z);

      // DOM labels follow their node (drei <Html> re-roots React and trips strict mode, so do it by hand)
      const label = nodesState.labels[i];
      if (label && g.parent) {
        proj.set(x, y - 0.8, z);
        g.parent.localToWorld(proj);
        proj.project(state.camera);
        label.style.transform = `translate3d(${((proj.x + 1) / 2) * size.width}px, ${((1 - proj.y) / 2) * size.height}px, 0) translate(-50%, 0)`;
        label.style.opacity = "1";
      }
    });

    const dock = seg(s.p, 0.78, 1);
    shellMat.opacity = dock * 0.35;
    coreHalo.opacity = dock * 0.55;
    if (shell.current) {
      shell.current.visible = dock > 0.01;
      shell.current.rotation.y += dt * 0.35;
      shell.current.rotation.x += dt * 0.2;
      shell.current.scale.setScalar(1.45 + Math.sin(s.t * 1.8) * 0.03 * dock);
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 6]} intensity={30} color="#f6e0cc" distance={20} />
      <Dust count={Math.round(ambient * 0.8)} extent={[10, 5.5, 4]} z={-1.5} size={1} drift={0.7} opacity={0.9} seed={31} />
      <group ref={rig}>
        {UNIFIED.map((_, i) => (
          <Node key={i} index={i} groupRef={(g) => void (nodes.current[i] = g)} />
        ))}
        {EDGES.map(([a, b], i) => (
          <Beam key={i} a={() => positions[a]} b={() => positions[b]} seed={i * 0.17} getOpacity={() => seg(st.current.p, 0.5, 0.82) * 0.95} />
        ))}
        <mesh ref={shell} material={shellMat} visible={false}>
          <icosahedronGeometry args={[1.5, 1]} />
        </mesh>
        <sprite material={coreHalo} scale={5.2} />
      </group>
      <Postfx quality={quality} strength={0.7} />
    </>
  );
}

export default function NodesScene() {
  return (
    <SceneCanvas className="absolute inset-0" flat={false} camera={{ position: [0, 0, 12], fov: 38 }} maxDpr={1.1} rootMargin="300px" maxFps={30}>
      <NodesWorld />
    </SceneCanvas>
  );
}

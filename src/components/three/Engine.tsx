"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { haloTexture } from "./textures";

export type EngineSpin = { v: number };

type RingSpec = {
  r: number;
  tube: number;
  z: number;
  speed: number;
  kind: "metal" | "glass" | "violet";
  wobble?: number;
};

const RINGS: RingSpec[] = [
  { r: 2.25, tube: 0.075, z: -0.95, speed: 0.22, kind: "metal", wobble: 0.1 },
  { r: 1.92, tube: 0.05, z: -0.5, speed: -0.38, kind: "glass", wobble: 0.14 },
  { r: 1.58, tube: 0.1, z: -0.05, speed: 0.55, kind: "metal" },
  { r: 1.26, tube: 0.05, z: 0.4, speed: -0.8, kind: "glass", wobble: 0.1 },
  { r: 0.98, tube: 0.07, z: 0.85, speed: 1.1, kind: "violet" },
];

/** Shared, lazily-created materials (one set per mounted engine). */
function useMaterials() {
  return useMemo(() => {
    const metal = new THREE.MeshStandardMaterial({
      color: "#6e4630",
      metalness: 1,
      roughness: 0.26,
      emissive: "#d99a6c",
      emissiveIntensity: 0.85,
      envMapIntensity: 1.7,
    });
    const violet = new THREE.MeshStandardMaterial({
      color: "#5a3a46",
      metalness: 1,
      roughness: 0.28,
      emissive: "#e6a4b8",
      emissiveIntensity: 0.95,
      envMapIntensity: 1.7,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: "#f3d9c2",
      metalness: 0.15,
      roughness: 0.06,
      transparent: true,
      opacity: 0.5,
      envMapIntensity: 2.4,
      emissive: "#d4a373",
      emissiveIntensity: 0.18,
    });
    const blade = new THREE.MeshStandardMaterial({
      color: "#ffd2b0",
      metalness: 0.6,
      roughness: 0.12,
      transparent: true,
      opacity: 0.78,
      envMapIntensity: 2,
      emissive: "#ffc4a0",
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide,
    });
    const core = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.40, 1.73, 1.20), toneMapped: false });
    const coreShell = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.40, 1.01, 0.70),
      transparent: true,
      opacity: 0.22,
      wireframe: true,
      toneMapped: false,
    });
    const funnel = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.30, 0.91, 0.55),
      transparent: true,
      opacity: 0.16,
      wireframe: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    return { metal, violet, glass, blade, core, coreShell, funnel };
  }, []);
}

type Props = {
  /** Spin multiplier read every frame (idle = 1). */
  spin: EngineSpin;
  /** Cheaper geometry for weak devices. */
  detail?: boolean;
  /** Add a point light so metal rings pick up the core glow. */
  lit?: boolean;
};

/**
 * The "growth engine": a turbine of glass and emissive-metal rings around a
 * glowing core. Its axis runs along world x so streams can flow through it.
 */
export default function Engine({ spin, detail = true, lit = true }: Props) {
  const m = useMaterials();
  const ringRefs = useRef<(THREE.Group | null)[]>([]);
  const turbine = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Sprite>(null);
  const gyroA = useRef<THREE.Mesh>(null);
  const gyroB = useRef<THREE.Mesh>(null);
  const roll = useRef<THREE.Group>(null);
  const clock = useRef({ t: 0, a: [0, 0, 0, 0, 0], turb: 0 });
  const seg = detail ? 56 : 36;

  const haloMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: haloTexture(),
        color: new THREE.Color(1.40, 1.01, 0.70),
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    const c = clock.current;
    const s = spin.v;
    c.t += dt;
    RINGS.forEach((r, i) => {
      c.a[i] += dt * r.speed * s;
      const g = ringRefs.current[i];
      if (!g) return;
      g.rotation.z = c.a[i];
      const w = r.wobble ?? 0;
      g.rotation.x = Math.sin(c.t * 0.6 + i * 1.7) * w;
      g.rotation.y = Math.cos(c.t * 0.5 + i * 1.1) * w;
    });
    c.turb += dt * 1.5 * s;
    if (turbine.current) turbine.current.rotation.z = c.turb;
    const pulse = 1 + Math.sin(c.t * 2.4) * 0.07 + (s - 1) * 0.04;
    core.current?.scale.setScalar(pulse);
    if (shell.current) {
      shell.current.rotation.y += dt * 0.6 * s;
      shell.current.rotation.x += dt * 0.35 * s;
      shell.current.scale.setScalar(pulse * 1.02);
    }
    if (halo.current) halo.current.scale.setScalar(3.6 + Math.sin(c.t * 2.4) * 0.25 + (s - 1) * 0.15);
    if (gyroA.current) gyroA.current.rotation.x += dt * 0.5 * s;
    if (gyroB.current) gyroB.current.rotation.y += dt * 0.42 * s;
    if (roll.current) roll.current.rotation.x += dt * 0.07 * s;
  });

  const mat = (k: RingSpec["kind"]) => (k === "glass" ? m.glass : k === "violet" ? m.violet : m.metal);

  return (
    <group>
      <Environment resolution={32} frames={1}>
        <Lightformer form="rect" intensity={5} color="#f0cfb0" position={[-5, 3, 4]} scale={[10, 2.4, 1]} />
        <Lightformer form="rect" intensity={4.5} color="#f0b8c8" position={[5, -2, 3]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={3.5} color="#ffc4a0" position={[0, 5, -3]} scale={[10, 1.6, 1]} />
        <Lightformer form="ring" intensity={3} color="#ffffff" position={[0, 0, 6]} scale={4} />
      </Environment>
      <ambientLight intensity={0.35} />
      {lit && <pointLight color="#ffb894" intensity={14} distance={9} decay={1.6} />}

      <group ref={roll}>
        {/* local z -> world x: the engine axis points along the flow */}
        <group rotation={[0, Math.PI / 2, 0]}>
          <mesh ref={core} material={m.core}>
            <icosahedronGeometry args={[0.46, 2]} />
          </mesh>
          <mesh ref={shell} material={m.coreShell}>
            <icosahedronGeometry args={[0.74, 2]} />
          </mesh>
          <sprite ref={halo} material={haloMat} scale={3.6} />

          {RINGS.map((r, i) => (
            <group key={i} ref={(el) => void (ringRefs.current[i] = el)} position={[0, 0, r.z]}>
              <mesh material={mat(r.kind)}>
                <torusGeometry args={[r.r, r.tube, detail ? 12 : 8, seg]} />
              </mesh>
            </group>
          ))}

          {/* turbine blades */}
          <group ref={turbine} position={[0, 0, 0.18]}>
            {Array.from({ length: 10 }).map((_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return (
                <group key={i} rotation={[0, 0, a]}>
                  <mesh position={[0.9, 0, 0]} rotation={[0.7, 0, 0]} material={m.blade}>
                    <boxGeometry args={[0.62, 0.34, 0.025]} />
                  </mesh>
                </group>
              );
            })}
          </group>

          {/* armillary rings */}
          <mesh ref={gyroA} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.62, 0.018, 8, seg]} />
            <meshBasicMaterial color={new THREE.Color(1.50, 1.08, 0.75)} toneMapped={false} transparent opacity={0.8} />
          </mesh>
          <mesh ref={gyroB} rotation={[0, Math.PI / 2, 0.6]}>
            <torusGeometry args={[2.78, 0.014, 8, seg]} />
            <meshBasicMaterial color={new THREE.Color(1.60, 0.95, 1.10)} toneMapped={false} transparent opacity={0.7} />
          </mesh>

          {/* intake / exhaust cones */}
          <mesh position={[0, 0, -1.9]} rotation={[-Math.PI / 2, 0, 0]} material={m.funnel}>
            <cylinderGeometry args={[2.4, 0.9, 1.7, 40, 3, true]} />
          </mesh>
          <mesh position={[0, 0, 1.9]} rotation={[-Math.PI / 2, 0, 0]} material={m.funnel}>
            <cylinderGeometry args={[0.9, 1.7, 1.7, 40, 3, true]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

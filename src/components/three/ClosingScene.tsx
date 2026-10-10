"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import Postfx from "./Postfx";
import { Dust } from "./Points";
import { clamp, damp, easeInOutCubic, seg } from "./math";
import { closingState } from "./progress";
import { haloTexture } from "./textures";
import { useQualitySettings } from "@/hooks/useQuality";

const COLORS = ["#d4a373", "#e6a4b8", "#ffc4a0"];

/** Three glowing spheres (one per term of the closing line) that merge into one as you scroll. */
function ClosingWorld() {
  const { quality, ambient } = useQualitySettings();
  const still = quality === "static";
  const spheres = useRef<(THREE.Group | null)[]>([]);
  const merged = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  const st = useRef({ p: still ? 1 : 0, t: 0 });

  const halo = useMemo(
    () =>
      COLORS.map(
        (c) =>
          new THREE.SpriteMaterial({
            map: haloTexture(),
            color: new THREE.Color(c).multiplyScalar(1.6),
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
      ),
    [],
  );
  const mergedHalo = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: haloTexture(),
        color: new THREE.Color(1.80, 1.30, 0.90),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const ring = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.90, 1.37, 0.95), transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide }),
    [],
  );
  const mergedCore = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.40, 1.73, 1.20), transparent: true, opacity: 0, toneMapped: false }),
    [],
  );

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.1);
    const s = st.current;
    s.t += dt;
    s.p = damp(s.p, still ? 1 : closingState.p, 7, dt);
    const { viewport } = state;
    const e = easeInOutCubic(seg(s.p, 0.12, 0.85));
    const r = clamp(Math.min(viewport.height * 0.2, viewport.width * 0.1), 0.35, 0.95);

    spheres.current.forEach((g, i) => {
      if (!g) return;
      const x0 = (closingState.xs[i] - 0.5) * viewport.width;
      const x = x0 * (1 - e);
      const bob = still ? 0 : Math.sin(s.t * 1.3 + i * 2.1) * 0.08 * (1 - e);
      g.position.set(x, bob, Math.sin(e * Math.PI) * 0.4);
      g.scale.setScalar(r * (1 - seg(s.p, 0.8, 0.9)));
      g.visible = s.p < 0.9;
    });

    const m = merged.current;
    if (m) {
      const k = seg(s.p, 0.82, 1);
      m.visible = k > 0.001;
      m.scale.setScalar(r * 1.55 * (0.6 + 0.4 * k) * (1 + Math.sin(s.t * 2.4) * 0.03));
      mergedCore.opacity = k;
      mergedHalo.opacity = k * 0.95;
    }
    if (flash.current) {
      const f = seg(s.p, 0.82, 1);
      flash.current.visible = f > 0.01 && f < 0.999;
      flash.current.scale.setScalar(r * (1.5 + f * 4));
      ring.opacity = (1 - f) * 0.9;
    }
  });

  return (
    <>
      <Dust count={Math.round(ambient * 0.5)} extent={[7, 2.4, 2]} z={-1} size={0.9} drift={0.5} opacity={0.8} seed={71} />
      {COLORS.map((c, i) => (
        <group key={c} ref={(el) => void (spheres.current[i] = el)}>
          <mesh>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color="#2a1c13" emissive={c} emissiveIntensity={1.1} roughness={0.12} metalness={0.2} />
          </mesh>
          <mesh scale={0.52}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial color={new THREE.Color(c).multiplyScalar(2.3)} toneMapped={false} />
          </mesh>
          <sprite material={halo[i]} scale={4.2} />
        </group>
      ))}
      <group ref={merged} visible={false}>
        <mesh material={mergedCore}>
          <sphereGeometry args={[1, 24, 24]} />
        </mesh>
        <sprite material={mergedHalo} scale={5.4} />
      </group>
      <mesh ref={flash} material={ring} visible={false}>
        <ringGeometry args={[0.92, 1, 64]} />
      </mesh>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 1, 5]} intensity={20} color="#f6e0cc" />
      <Postfx quality={quality} strength={0.9} />
    </>
  );
}

export default function ClosingScene() {
  return (
    <SceneCanvas className="absolute inset-0" flat={false} camera={{ position: [0, 0, 9], fov: 38 }} maxDpr={1.1} rootMargin="250px" maxFps={30}>
      <ClosingWorld />
    </SceneCanvas>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { clamp, easeOutBack, easeOutCubic, mulberry32, seg, smooth } from "./math";
import { haloTexture, networkBadgeTexture } from "./textures";

/**
 * Small animated 3D icons for the eight journey steps. Each is authored in a
 * ~1 unit radius and scaled by the scene to the card's icon slot. They loop on
 * their own clock; `energy` (0..1) is how "active" the card is, which speeds
 * them up and brightens them.
 */

export type IconProps = { energy: () => number };

const C = {
  blue: "#d4a373",
  cyan: "#ffc4a0",
  violet: "#e6a4b8",
  green: "#a8d5ba",
  white: "#fbefe3",
  ink: "#2a1c13",
  grey: "#9a8070",
};

function emissive(color: string, intensity = 1) {
  return new THREE.Color(color).multiplyScalar(intensity);
}

const mats = (() => {
  let m: ReturnType<typeof build> | null = null;
  function build() {
    return {
      panel: new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.4, metalness: 0.4, emissive: "#6e4630", emissiveIntensity: 0.35 }),
      glass: new THREE.MeshStandardMaterial({ color: "#f3d9c2", roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35, emissive: "#d4a373", emissiveIntensity: 0.25, side: THREE.DoubleSide }),
      cyan: new THREE.MeshBasicMaterial({ color: emissive(C.cyan, 1.5), toneMapped: false }),
      blue: new THREE.MeshBasicMaterial({ color: emissive(C.blue, 1.5), toneMapped: false }),
      violet: new THREE.MeshBasicMaterial({ color: emissive(C.violet, 1.6), toneMapped: false }),
      green: new THREE.MeshBasicMaterial({ color: emissive(C.green, 1.6), toneMapped: false }),
      white: new THREE.MeshBasicMaterial({ color: emissive(C.white, 1.3), toneMapped: false }),
      dim: new THREE.MeshBasicMaterial({ color: new THREE.Color("#7a5a45"), toneMapped: false }),
      metal: new THREE.MeshStandardMaterial({ color: "#b9835a", metalness: 1, roughness: 0.25, emissive: "#ffc4a0", emissiveIntensity: 0.55 }),
      additive: new THREE.MeshBasicMaterial({ color: emissive(C.cyan, 1.4), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    };
  }
  return () => (m ??= build());
})();

/** Wraps an icon so it breathes with the card's energy. */
function Energized({ energy, children }: { energy: () => number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!g.current) return;
    const e = energy();
    const bob = Math.sin(s.clock.elapsedTime * 1.3) * 0.04;
    g.current.position.y = bob;
    g.current.scale.setScalar(0.88 + e * 0.2);
  });
  return <group ref={g}>{children}</group>;
}

/** time scaled by energy so inactive icons idle slowly */
function useClock(energy: () => number) {
  const t = useRef(0);
  return (dt: number) => {
    t.current += Math.min(dt, 0.05) * (0.45 + energy() * 0.9);
    return t.current;
  };
}

/* ------------------------------------------------------------------ */
/* 01 UNDERSTAND: magnifier scanning a document                         */
/* ------------------------------------------------------------------ */
export function IconScan({ energy }: IconProps) {
  const m = mats();
  const lens = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const tick = useClock(energy);
  useFrame((_, dt) => {
    const t = tick(dt);
    if (lens.current) {
      lens.current.position.x = Math.sin(t * 1.1) * 0.4;
      lens.current.position.y = Math.cos(t * 0.8) * 0.5 - 0.05;
      lens.current.rotation.z = Math.sin(t * 1.1) * 0.12;
    }
    if (beam.current) {
      beam.current.position.y = Math.sin(t * 1.6) * 0.8;
      (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 3.2) * 0.12;
    }
  });
  return (
    <Energized energy={energy}>
      <group rotation={[-0.18, 0.35, 0]}>
        <RoundedBox args={[1.5, 1.95, 0.08]} radius={0.08} smoothness={2} material={m.panel} />
        {[0.7, 0.4, 0.1, -0.2, -0.5, -0.78].map((y, i) => (
          <mesh key={y} position={[(i % 2 ? 0.08 : -0.06), y, 0.06]} material={i === 0 ? m.cyan : m.dim}>
            <boxGeometry args={[i === 0 ? 0.7 : 1.0 - (i % 3) * 0.2, 0.07, 0.02]} />
          </mesh>
        ))}
        <mesh ref={beam} position={[0, 0, 0.1]} material={m.additive}>
          <planeGeometry args={[1.55, 0.12]} />
        </mesh>
        <group ref={lens} position={[0, 0, 0.3]}>
          <mesh material={m.metal}>
            <torusGeometry args={[0.46, 0.075, 16, 48]} />
          </mesh>
          <mesh>
            <circleGeometry args={[0.44, 32]} />
            <meshBasicMaterial color={emissive(C.cyan, 1)} transparent opacity={0.16} toneMapped={false} />
          </mesh>
          <mesh position={[0.4, -0.4, 0]} rotation={[0, 0, Math.PI / 4]} material={m.metal}>
            <cylinderGeometry args={[0.07, 0.085, 0.62, 12]} />
          </mesh>
        </group>
      </group>
    </Energized>
  );
}

/* ------------------------------------------------------------------ */
/* 02 DEFINE: target + persona                                          */
/* ------------------------------------------------------------------ */
export function IconTarget({ energy }: IconProps) {
  const m = mats();
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const orbit = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const tick = useClock(energy);
  useFrame((_, dt) => {
    const t = tick(dt);
    rings.current.forEach((r, i) => {
      if (!r) return;
      const k = 1 + Math.max(0, Math.sin(t * 2.2 - i * 0.7)) * 0.1;
      r.scale.setScalar(k);
    });
    if (orbit.current) orbit.current.rotation.z = t * 1.2;
    if (root.current) {
      root.current.rotation.y = Math.sin(t * 0.7) * 0.4;
      root.current.rotation.x = Math.cos(t * 0.6) * 0.25;
    }
  });
  return (
    <Energized energy={energy}>
      <group ref={root}>
        {[0.95, 0.64, 0.33].map((r, i) => (
          <mesh key={r} ref={(el) => void (rings.current[i] = el)} material={i === 1 ? m.violet : i === 0 ? m.blue : m.cyan}>
            <torusGeometry args={[r, 0.045, 12, 64]} />
          </mesh>
        ))}
        <mesh position={[0, 0.1, 0.05]} material={m.white}>
          <sphereGeometry args={[0.11, 20, 20]} />
        </mesh>
        <mesh position={[0, -0.12, 0.05]} material={m.white}>
          <capsuleGeometry args={[0.15, 0.08, 6, 14]} />
        </mesh>
        <group ref={orbit}>
          {[0, 2.1, 4.2].map((a) => (
            <mesh key={a} position={[Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0]} material={m.green}>
              <sphereGeometry args={[0.075, 14, 14]} />
            </mesh>
          ))}
        </group>
      </group>
    </Energized>
  );
}

/* ------------------------------------------------------------------ */
/* 03 ATTRACT: floating ad cards (network / social / video)             */
/* ------------------------------------------------------------------ */
function lemniscate() {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = (i / 80) * Math.PI * 2;
    const d = 1 + Math.sin(t) * Math.sin(t);
    pts.push(new THREE.Vector3((0.34 * Math.cos(t)) / d * 1.6, (0.34 * Math.sin(t) * Math.cos(t)) / d * 1.6, 0));
  }
  return new THREE.CatmullRomCurve3(pts, true);
}

export function IconAds({ energy }: IconProps) {
  const m = mats();
  const cards = useRef<(THREE.Group | null)[]>([]);
  const tick = useClock(energy);
  const badge = useMemo(() => new THREE.MeshBasicMaterial({ map: networkBadgeTexture(), transparent: true, toneMapped: false }), []);
  const metaGeo = useMemo(() => new THREE.TubeGeometry(lemniscate(), 80, 0.055, 10, true), []);
  const play = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.14, -0.2);
    s.lineTo(0.22, 0);
    s.lineTo(-0.14, 0.2);
    s.closePath();
    return s;
  }, []);
  const base: { x: number; y: number; z: number; r: number }[] = [
    { x: -0.62, y: 0.05, z: 0, r: 0.2 },
    { x: 0.02, y: -0.05, z: 0.28, r: -0.04 },
    { x: 0.66, y: 0.08, z: 0.05, r: -0.2 },
  ];
  useFrame((_, dt) => {
    const t = tick(dt);
    cards.current.forEach((c, i) => {
      if (!c) return;
      const b = base[i];
      c.position.set(b.x, b.y + Math.sin(t * 1.4 + i * 1.7) * 0.09, b.z);
      c.rotation.set(0, Math.sin(t * 0.8 + i) * 0.28 - b.r * 1.2, b.r + Math.sin(t * 1.1 + i) * 0.04);
    });
  });
  const frame = (color: string, i: number, children: React.ReactNode) => (
    <group ref={(el) => void (cards.current[i] = el)}>
      <RoundedBox args={[0.92, 1.35, 0.07]} radius={0.09} smoothness={2}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.3} metalness={0.3} />
      </RoundedBox>
      <RoundedBox args={[0.78, 1.21, 0.05]} radius={0.06} smoothness={2} position={[0, 0, 0.03]} material={m.panel} />
      {children}
    </group>
  );
  return (
    <Energized energy={energy}>
      <group scale={0.88}>
        {frame("#c98a6b", 0, (
          <>
            <mesh position={[0, 0.38, 0.07]} material={badge}>
              <planeGeometry args={[0.36, 0.36]} />
            </mesh>
            {[0.0, -0.16, -0.32, -0.5].map((y, k) => (
              <mesh key={y} position={[k === 3 ? -0.12 : 0, y, 0.065]} material={k === 0 ? m.cyan : m.dim}>
                <boxGeometry args={[k === 3 ? 0.36 : 0.56, 0.06, 0.01]} />
              </mesh>
            ))}
          </>
        ))}
        {frame("#d9a679", 1, (
          <>
            <mesh geometry={metaGeo} position={[0, 0.3, 0.075]} material={m.white} />
            {[-0.1, -0.28, -0.46].map((y, k) => (
              <mesh key={y} position={[0, y, 0.065]} material={k === 0 ? m.blue : m.dim}>
                <boxGeometry args={[0.56 - k * 0.1, 0.06, 0.01]} />
              </mesh>
            ))}
          </>
        ))}
        {frame(C.violet, 2, (
          <>
            <mesh position={[0, 0.25, 0.065]} material={m.dim}>
              <planeGeometry args={[0.62, 0.42]} />
            </mesh>
            <mesh position={[0.02, 0.25, 0.075]} material={m.white}>
              <shapeGeometry args={[play]} />
            </mesh>
            {[-0.2, -0.38].map((y, k) => (
              <mesh key={y} position={[0, y, 0.065]} material={k === 0 ? m.violet : m.dim}>
                <boxGeometry args={[0.56 - k * 0.14, 0.06, 0.01]} />
              </mesh>
            ))}
          </>
        ))}
      </group>
    </Energized>
  );
}

/* ------------------------------------------------------------------ */
/* 04 CONVERT: a browser window assembling itself                       */
/* ------------------------------------------------------------------ */
type Part = { pos: [number, number, number]; size: [number, number]; mat: keyof ReturnType<typeof mats>; z: number };

export function IconBrowser({ energy }: IconProps) {
  const m = mats();
  const refs = useRef<(THREE.Group | null)[]>([]);
  const tick = useClock(energy);
  const parts = useMemo<Part[]>(
    () => [
      { pos: [0, 0, 0], size: [1.9, 1.45], mat: "panel", z: 0 },
      { pos: [0, 0.6, 0.05], size: [1.9, 0.26], mat: "blue", z: 1 },
      { pos: [-0.74, 0.6, 0.09], size: [0.09, 0.09], mat: "white", z: 2 },
      { pos: [-0.56, 0.6, 0.09], size: [0.09, 0.09], mat: "white", z: 3 },
      { pos: [0, 0.18, 0.06], size: [1.62, 0.5], mat: "violet", z: 4 },
      { pos: [-0.42, -0.4, 0.06], size: [0.72, 0.4], mat: "cyan", z: 5 },
      { pos: [0.44, -0.4, 0.06], size: [0.72, 0.4], mat: "dim", z: 6 },
      { pos: [0.1, 0.18, 0.1], size: [0.9, 0.1], mat: "white", z: 7 },
    ],
    [],
  );
  const offs = useMemo(() => {
    const r = mulberry32(8);
    return parts.map(() => [(r() - 0.5) * 3.4, (r() - 0.5) * 3, (r() - 0.5) * 1.6, (r() - 0.5) * 1.6] as const);
  }, [parts]);
  useFrame((_, dt) => {
    const t = tick(dt);
    const loop = (t % 5.2) / 5.2;
    parts.forEach((p, i) => {
      const g = refs.current[i];
      if (!g) return;
      const start = 0.02 + p.z * 0.045;
      const k = easeOutBack(seg(loop, start, start + 0.2));
      const out = smooth(seg(loop, 0.88, 1));
      const f = clamp(1 - k, -0.2, 1) + out;
      const o = offs[i];
      g.position.set(p.pos[0] + o[0] * f, p.pos[1] + o[1] * f, p.pos[2] + o[2] * f);
      g.rotation.set(o[3] * f * 0.6, o[2] * f * 0.5, o[3] * f);
      g.scale.setScalar(clamp(0.2 + (1 - Math.abs(f)) * 0.8, 0.001, 1));
    });
  });
  return (
    <Energized energy={energy}>
      <group rotation={[-0.1, -0.3, 0]} scale={0.92}>
        {parts.map((p, i) => (
          <group key={i} ref={(el) => void (refs.current[i] = el)}>
            <mesh material={m[p.mat]}>
              <boxGeometry args={[p.size[0], p.size[1], 0.05]} />
            </mesh>
          </group>
        ))}
      </group>
    </Energized>
  );
}

/* ------------------------------------------------------------------ */
/* 05 ENGAGE: Rene, the friendly AI orb                                 */
/* ------------------------------------------------------------------ */
export function IconRene({ energy }: IconProps) {
  const m = mats();
  const root = useRef<THREE.Group>(null);
  const eyes = useRef<(THREE.Mesh | null)[]>([]);
  const sats = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const tick = useClock(energy);
  const halo = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: haloTexture(),
        color: emissive(C.cyan, 1.5),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useFrame((_, dt) => {
    const t = tick(dt);
    if (root.current) {
      root.current.rotation.y = Math.sin(t * 0.8) * 0.35;
      root.current.rotation.x = Math.cos(t * 0.6) * 0.12;
      root.current.position.y = Math.sin(t * 1.6) * 0.07;
    }
    // blink
    const b = Math.max(0, Math.sin(t * 1.15 + 1.2) * 12 - 11);
    eyes.current.forEach((e) => e?.scale.set(1, (1 - clamp(b, 0, 0.92)) * 1.5, 0.5));
    if (sats.current) sats.current.rotation.z = t * 0.9;
    if (ring.current) ring.current.rotation.x = Math.PI / 2.4 + Math.sin(t * 0.7) * 0.2;
    if (glow.current) glow.current.scale.setScalar(3.1 + Math.sin(t * 2.2) * 0.2);
  });
  return (
    <Energized energy={energy}>
      <sprite ref={glow} material={halo} scale={3.1} />
      <group ref={root}>
        <mesh>
          <sphereGeometry args={[0.72, 24, 24]} />
          <meshPhysicalMaterial color="#8a5a3c" emissive="#d4a373" emissiveIntensity={0.85} roughness={0.12} metalness={0.15} transparent opacity={0.95} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.5, 20, 20]} />
          <meshBasicMaterial color={emissive("#ffd9bf", 1.2)} transparent opacity={0.28} toneMapped={false} />
        </mesh>
        {[-0.24, 0.24].map((x, i) => (
          <mesh key={x} ref={(el) => void (eyes.current[i] = el)} position={[x, 0.13, 0.665]} scale={[1, 1, 0.5]} material={m.white}>
            <sphereGeometry args={[0.07, 16, 16]} />
          </mesh>
        ))}
        <mesh position={[0, -0.08, 0.64]} rotation={[0, 0, Math.PI]} material={m.white}>
          <torusGeometry args={[0.2, 0.03, 8, 24, Math.PI]} />
        </mesh>
        <mesh ref={ring} material={m.cyan}>
          <torusGeometry args={[1.0, 0.02, 8, 80]} />
        </mesh>
        <group ref={sats}>
          {[0, 2.1, 4.2].map((a) => (
            <mesh key={a} position={[Math.cos(a) * 1.0, Math.sin(a) * 0.55, Math.sin(a) * 0.4]} material={m.violet}>
              <sphereGeometry args={[0.07, 12, 12]} />
            </mesh>
          ))}
        </group>
      </group>
    </Energized>
  );
}

/* ------------------------------------------------------------------ */
/* 06 QUALIFY: funnel sorting particles                                 */
/* ------------------------------------------------------------------ */
const FUNNEL_N = 26;

export function IconFunnel({ energy }: IconProps) {
  const m = mats();
  const inst = useRef<THREE.InstancedMesh>(null);
  const tick = useClock(energy);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => {
    const r = mulberry32(21);
    return Array.from({ length: FUNNEL_N }, (_, i) => ({
      phase: i / FUNNEL_N,
      x: (r() - 0.5) * 1.5,
      z: (r() - 0.5) * 0.8,
      keep: r() > 0.38,
      side: r() > 0.5 ? 1 : -1,
    }));
  }, []);
  const colors = useMemo(() => data.map((d) => new THREE.Color(d.keep ? emissive(C.green, 1.6) : new THREE.Color(C.grey))), [data]);

  useFrame((_, dt) => {
    const t = tick(dt);
    const im = inst.current;
    if (!im) return;
    data.forEach((d, i) => {
      const u = (d.phase + t * 0.22) % 1;
      const top = 1.05;
      const bottom = -1.15;
      let y = top + (bottom - top) * u;
      const wall = 0.2 + 0.78 * smooth((y + 0.65) / 1.7); // funnel radius at height y
      let x = d.x;
      let alpha = 1;
      if (d.keep) {
        x = d.x * clamp(wall / 0.9, 0, 1) * 0.9 * (1 - smooth(seg(u, 0.4, 0.62)) * 0.9);
      } else {
        const out = smooth(seg(u, 0.38, 0.6));
        x = d.x * clamp(wall / 0.9, 0, 1) * (1 - out) + d.side * 1.5 * out;
        y -= out * 0.15;
        alpha = 1 - smooth(seg(u, 0.55, 0.75));
      }
      dummy.position.set(x, y, d.z * clamp(wall, 0.1, 1));
      const sc = (d.keep ? 0.075 : 0.065) * (u < 0.06 ? u / 0.06 : 1) * alpha * (d.keep && u > 0.62 ? 1.5 : 1);
      dummy.scale.setScalar(Math.max(sc, 0.0001));
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <Energized energy={energy}>
      <group rotation={[0.1, 0, 0]}>
        <mesh position={[0, -0.05, 0]} material={m.glass}>
          <cylinderGeometry args={[1.0, 0.2, 1.7, 36, 1, true]} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[1.0, 0.2, 1.7, 18, 4, true]} />
          <meshBasicMaterial color={emissive(C.cyan, 0.9)} wireframe transparent opacity={0.28} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.cyan}>
          <torusGeometry args={[1.0, 0.035, 8, 48]} />
        </mesh>
        <instancedMesh
          ref={(im) => {
            inst.current = im;
            if (im) colors.forEach((c, i) => im.setColorAt(i, c));
          }}
          args={[undefined, undefined, FUNNEL_N]}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      </group>
    </Energized>
  );
}

/* ------------------------------------------------------------------ */
/* 07 BOOK: calendar slot locking in                                    */
/* ------------------------------------------------------------------ */
export function IconCalendar({ energy }: IconProps) {
  const m = mats();
  const slot = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const check = useRef<THREE.Mesh>(null);
  const tick = useClock(energy);
  const checkGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.1, 0, 0), new THREE.Vector3(-0.03, -0.08, 0), new THREE.Vector3(0.12, 0.09, 0)], false, "catmullrom", 0.05);
    return new THREE.TubeGeometry(curve, 16, 0.028, 8, false);
  }, []);
  const cells = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) out.push({ x: -0.6 + c * 0.4, y: 0.2 - r * 0.38 });
    return out;
  }, []);
  const target = { x: 0.2, y: -0.18 };
  useFrame((_, dt) => {
    const t = tick(dt);
    const loop = (t % 3.8) / 3.8;
    const drop = easeOutBack(seg(loop, 0.08, 0.34));
    const out = smooth(seg(loop, 0.9, 1));
    if (slot.current) {
      slot.current.position.set(target.x, target.y + (1 - drop) * 1.6, 0.12 + (1 - drop) * 0.5);
      slot.current.scale.setScalar(clamp(drop, 0, 1.3) * (1 - out));
    }
    const lock = seg(loop, 0.32, 0.6);
    if (pulse.current) {
      pulse.current.scale.setScalar(0.3 + lock * 2.1);
      (pulse.current.material as THREE.MeshBasicMaterial).opacity = (1 - lock) * (lock > 0 ? 0.8 : 0);
      pulse.current.position.set(target.x, target.y, 0.1);
    }
    if (check.current) {
      check.current.scale.setScalar(easeOutCubic(seg(loop, 0.36, 0.5)) * (1 - out));
    }
  });
  return (
    <Energized energy={energy}>
      <group rotation={[-0.14, 0.3, 0]}>
        <RoundedBox args={[1.9, 1.7, 0.1]} radius={0.1} smoothness={2} material={m.panel} />
        <mesh position={[0, 0.66, 0.06]} material={m.blue}>
          <boxGeometry args={[1.9, 0.34, 0.04]} />
        </mesh>
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 0.86, 0.08]} material={m.white}>
            <capsuleGeometry args={[0.04, 0.16, 4, 8]} />
          </mesh>
        ))}
        {cells.map((c, i) => (
          <mesh key={i} position={[c.x, c.y, 0.07]} material={m.dim}>
            <boxGeometry args={[0.3, 0.26, 0.03]} />
          </mesh>
        ))}
        <mesh ref={pulse} position={[target.x, target.y, 0.1]}>
          <ringGeometry args={[0.2, 0.24, 32]} />
          <meshBasicMaterial color={emissive(C.green, 1.5)} transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <group ref={slot}>
          <mesh material={m.green}>
            <boxGeometry args={[0.36, 0.32, 0.06]} />
          </mesh>
          <mesh ref={check} geometry={checkGeo} position={[0, 0, 0.05]} material={m.white} />
        </group>
      </group>
    </Energized>
  );
}

/* ------------------------------------------------------------------ */
/* 08 SYNC: data streaming into a CRM dashboard                         */
/* ------------------------------------------------------------------ */
export function IconCrm({ energy }: IconProps) {
  const m = mats();
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const packets = useRef<(THREE.Mesh | null)[]>([]);
  const tick = useClock(energy);
  const heights = [0.5, 0.85, 0.65, 1.1];
  useFrame((_, dt) => {
    const t = tick(dt);
    bars.current.forEach((b, i) => {
      if (!b) return;
      const h = heights[i] * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.5 - i * 0.9)));
      b.scale.y = h;
      b.position.y = -0.4 + h * 0.5 * 0.8;
    });
    packets.current.forEach((p, i) => {
      if (!p) return;
      const u = (t * 0.55 + i / 6) % 1;
      p.position.set(-1.9 + 1.45 * u, -0.3 + Math.sin(u * Math.PI * 2 + i) * 0.22 * (1 - u), 0.15);
      p.scale.setScalar(0.07 * (u > 0.88 ? (1 - u) / 0.12 : 1));
    });
  });
  return (
    <Energized energy={energy}>
      <group rotation={[-0.1, -0.28, 0]} position={[0.25, 0, 0]}>
        <RoundedBox args={[1.9, 1.45, 0.08]} radius={0.08} smoothness={2} material={m.panel} />
        <mesh position={[0, 0.62, 0.05]} material={m.violet}>
          <boxGeometry args={[1.9, 0.2, 0.03]} />
        </mesh>
        {heights.map((h, i) => (
          <mesh key={i} ref={(el) => void (bars.current[i] = el)} position={[-0.55 + i * 0.3, -0.2, 0.08]} material={i === 3 ? m.green : m.cyan}>
            <boxGeometry args={[0.2, 0.8, 0.05]} />
          </mesh>
        ))}
        {[0.28, 0.1, -0.08].map((y, i) => (
          <mesh key={y} position={[0.62, y, 0.07]} material={i === 0 ? m.blue : m.dim}>
            <boxGeometry args={[0.55 - i * 0.08, 0.06, 0.02]} />
          </mesh>
        ))}
      </group>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} ref={(el) => void (packets.current[i] = el)} material={i % 2 ? m.cyan : m.green}>
          <sphereGeometry args={[1, 10, 10]} />
        </mesh>
      ))}
      <mesh position={[-1.2, -0.3, 0.1]} material={m.additive}>
        <planeGeometry args={[1.5, 0.05]} />
      </mesh>
    </Energized>
  );
}

export const STEP_ICONS = [IconScan, IconTarget, IconAds, IconBrowser, IconRene, IconFunnel, IconCalendar, IconCrm];

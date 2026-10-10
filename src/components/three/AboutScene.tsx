"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import Postfx from "./Postfx";
import { Dust } from "./Points";
import { arcFragment, beamVertex } from "./fx";
import { clamp, damp, mulberry32 } from "./math";
import { pointer } from "./pointer";
import { haloTexture } from "./textures";
import { useQualitySettings } from "@/hooks/useQuality";

const R = 2.6;

/** lat, lon -> point on a sphere (lon 0 faces +z). */
function ll(lat: number, lon: number, r = R) {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(phi) * Math.sin(lam), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lam));
}

/** Rough outline of the contiguous United States as [lat, lon]. */
const US: [number, number][] = [
  [48.4, -124.7], [46.2, -124.0], [43.0, -124.4], [40.4, -124.4], [38.0, -123.0], [36.6, -121.9], [34.5, -120.5], [34.0, -118.5],
  [32.6, -117.1], [32.7, -114.7], [31.3, -111.1], [31.8, -108.2], [31.8, -106.5], [29.8, -104.4], [29.0, -103.1], [29.7, -101.4],
  [27.5, -99.5], [26.0, -97.2], [27.8, -97.2], [29.3, -94.8], [29.6, -92.0], [29.1, -89.2], [30.2, -88.0], [30.0, -85.5],
  [29.0, -83.0], [27.0, -82.6], [25.2, -81.1], [25.8, -80.2], [27.2, -80.0], [29.0, -80.9], [30.7, -81.4], [32.0, -80.8],
  [33.8, -78.5], [35.2, -75.5], [36.9, -76.0], [38.3, -75.1], [39.4, -74.0], [40.5, -74.0], [41.0, -72.0], [41.3, -71.5],
  [42.0, -70.0], [43.7, -70.2], [44.8, -66.9], [47.4, -69.2], [45.0, -71.5], [45.0, -74.7], [43.6, -76.5], [43.3, -79.0],
  [42.0, -83.0], [43.6, -82.5], [45.9, -83.5], [46.5, -84.5], [46.9, -88.0], [48.0, -89.5], [49.0, -95.1], [49.0, -123.0],
];

function insideUS(lat: number, lon: number) {
  let inside = false;
  for (let i = 0, j = US.length - 1; i < US.length; j = i++) {
    const [yi, xi] = US[i];
    const [yj, xj] = US[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const CITIES: [string, number, number][] = [
  ["Seattle", 47.6, -122.3],
  ["Los Angeles", 34.0, -118.2],
  ["Phoenix", 33.4, -112.0],
  ["Denver", 39.7, -105.0],
  ["Dallas", 32.8, -96.8],
  ["Chicago", 41.9, -87.6],
  ["Atlanta", 33.7, -84.4],
  ["Miami", 25.8, -80.2],
  ["New York", 40.7, -74.0],
  ["Boston", 42.4, -71.0],
];
const LINKS: [number, number][] = [
  [0, 3], [0, 5], [1, 2], [1, 3], [2, 4], [3, 5], [3, 4], [4, 6], [4, 5], [5, 8], [5, 9], [6, 7], [6, 8], [8, 9], [1, 5], [4, 8],
];

function arcCurve(a: THREE.Vector3, b: THREE.Vector3) {
  const pts: THREE.Vector3[] = [];
  const angle = a.angleTo(b);
  const lift = 0.12 + angle * 0.34;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const p = new THREE.Vector3().copy(a).normalize().lerp(b.clone().normalize(), t).normalize();
    p.multiplyScalar(R * (1.005 + Math.sin(Math.PI * t) * lift));
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

function Globe({ detail }: { detail: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const halos = useRef<(THREE.Sprite | null)[]>([]);

  const { grid, usDots, worldDots, arcs, cityPos } = useMemo(() => {
    // wireframe: parallels every 15 deg, meridians every 15 deg
    const pos: number[] = [];
    for (let lat = -75; lat <= 75; lat += 15) {
      for (let lon = 0; lon < 360; lon += 4) {
        const a = ll(lat, lon);
        const b = ll(lat, lon + 4);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (let lon = 0; lon < 360; lon += 15) {
      for (let lat = -88; lat < 88; lat += 4) {
        const a = ll(lat, lon);
        const b = ll(lat + 4, lon);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const grid = new THREE.BufferGeometry();
    grid.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));

    const us: number[] = [];
    const step = detail ? 0.9 : 1.4;
    for (let lat = 24; lat <= 50; lat += step) {
      for (let lon = -125; lon <= -66; lon += step) {
        if (!insideUS(lat, lon)) continue;
        const p = ll(lat, lon, R * 1.004);
        us.push(p.x, p.y, p.z);
      }
    }
    const usDots = new THREE.BufferGeometry();
    usDots.setAttribute("position", new THREE.Float32BufferAttribute(us, 3));

    const rand = mulberry32(6);
    const w: number[] = [];
    const n = detail ? 520 : 260;
    for (let i = 0; i < n; i++) {
      const lat = Math.asin(rand() * 2 - 1) * (180 / Math.PI);
      const lon = rand() * 360 - 180;
      if (lat > 22 && lat < 52 && lon > -128 && lon < -64) continue;
      const p = ll(lat, lon, R * 1.003);
      w.push(p.x, p.y, p.z);
    }
    const worldDots = new THREE.BufferGeometry();
    worldDots.setAttribute("position", new THREE.Float32BufferAttribute(w, 3));

    const cityPos = CITIES.map(([, la, lo]) => ll(la, lo, R * 1.01));
    const arcs = LINKS.map(([a, b]) => new THREE.TubeGeometry(arcCurve(cityPos[a], cityPos[b]), 48, 0.011, 5, false));
    return { grid, usDots, worldDots, arcs, cityPos };
  }, [detail]);

  const mats = useMemo(
    () => ({
      line: new THREE.LineBasicMaterial({ color: new THREE.Color("#d4a373"), transparent: true, opacity: 0.2, depthWrite: false }),
      us: new THREE.PointsMaterial({ color: new THREE.Color(1.40, 1.01, 0.70), size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.95, toneMapped: false, depthWrite: false }),
      world: new THREE.PointsMaterial({ color: new THREE.Color("#c89a7e"), size: 0.028, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false }),
      occluder: new THREE.MeshBasicMaterial({ colorWrite: false }),
      glow: new THREE.MeshBasicMaterial({ color: new THREE.Color("#d4a373"), transparent: true, opacity: 0.07, side: THREE.BackSide, depthWrite: false }),
      city: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.20, 1.58, 1.10), toneMapped: false }),
      halo: new THREE.SpriteMaterial({ map: haloTexture(), color: new THREE.Color(1.50, 1.08, 0.75), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    }),
    [],
  );

  const arcMats = useMemo(
    () =>
      arcs.map(
        (_, i) =>
          new THREE.ShaderMaterial({
            vertexShader: beamVertex,
            fragmentShader: arcFragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
              uTime: { value: 0 },
              uSeed: { value: (i * 0.137) % 1 },
              uOpacity: { value: 1 },
              uColorA: { value: new THREE.Color("#d4a373") },
              uColorB: { value: new THREE.Color("#ffc4a0") },
            },
          }),
      ),
    [arcs],
  );
  useEffect(() => () => arcMats.forEach((m) => m.dispose()), [arcMats]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // slow sway around the United States so it stays the hero of the globe
    if (spin.current) spin.current.rotation.y = 1.69 + Math.sin(t * 0.12) * 0.38;
    arcMats.forEach((m) => (m.uniforms.uTime.value = t));
    halos.current.forEach((h, i) => h?.scale.setScalar(0.5 + Math.sin(t * 2 + i * 1.3) * 0.08));
  });

  return (
    <group rotation={[0.62, 0, 0]}>
      <group ref={spin}>
        <mesh material={mats.occluder}>
          <sphereGeometry args={[R * 0.995, 48, 48]} />
        </mesh>
        <mesh material={mats.glow} scale={1.06}>
          <sphereGeometry args={[R, 32, 32]} />
        </mesh>
        <lineSegments geometry={grid} material={mats.line} />
        <points geometry={worldDots} material={mats.world} />
        <points geometry={usDots} material={mats.us} />
        {arcs.map((g, i) => (
          <mesh key={i} geometry={g} material={arcMats[i]} />
        ))}
        {cityPos.map((p, i) => (
          <group key={i} position={p}>
            <mesh material={mats.city}>
              <sphereGeometry args={[0.035, 12, 12]} />
            </mesh>
            <sprite ref={(el) => void (halos.current[i] = el)} material={mats.halo} scale={0.5} />
          </group>
        ))}
      </group>
    </group>
  );
}

function AboutWorld() {
  const { quality, ambient } = useQualitySettings();
  const rig = useRef<THREE.Group>(null);
  const st = useRef({ px: 0, py: 0 });

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.1);
    const s = st.current;
    s.px = damp(s.px, pointer.active ? pointer.x : 0, 2, dt);
    s.py = damp(s.py, pointer.active ? pointer.y : 0, 2, dt);
    const { viewport, size } = state;
    const wide = size.width >= 900;
    const scale = clamp(Math.min(viewport.width / 8, viewport.height / 6.8), 0.45, 1.15);
    const g = rig.current;
    if (g) {
      g.scale.setScalar(scale);
      g.position.set(wide ? viewport.width * 0.24 : 0, 0, 0);
      g.rotation.y = s.px * 0.12;
      g.rotation.x = -s.py * 0.08;
    }
  });

  return (
    <>
      <Dust count={Math.round(ambient * 0.7)} extent={[9, 5, 4]} z={-2} size={1} drift={0.6} opacity={0.8} seed={61} />
      <group ref={rig}>
        <Globe detail={quality !== "low"} />
      </group>
      <Postfx quality={quality} strength={0.8} />
    </>
  );
}

export default function AboutScene() {
  return (
    <SceneCanvas className="absolute inset-0" flat={false} camera={{ position: [0, 0, 10], fov: 38 }} maxDpr={1.1} rootMargin="300px" maxFps={30}>
      <AboutWorld />
    </SceneCanvas>
  );
}

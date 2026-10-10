"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import { Burst } from "./Points";
import { STEP_ICONS } from "./journeyIcons";
import { fresnelFragment, fresnelVertex, trackFragment, trackVertex } from "./fx";
import { clamp, damp, easeInOutCubic, seg, smooth } from "./math";
import { journey } from "./progress";
import { haloTexture } from "./textures";
import { useQualitySettings } from "@/hooks/useQuality";

const STATIONS = 8;
const TRAIL = 6;

function JourneyWorld() {
  const { quality } = useQualitySettings();
  const track = useRef<THREE.Mesh>(null);
  const orb = useRef<THREE.Group>(null);
  const orbHalo = useRef<THREE.Sprite>(null);
  const trail = useRef<(THREE.Sprite | null)[]>([]);
  const stations = useRef<(THREE.Group | null)[]>([]);
  const stationRings = useRef<(THREE.Mesh | null)[]>([]);
  const stationHalos = useRef<(THREE.Sprite | null)[]>([]);
  const icons = useRef<(THREE.Group | null)[]>([]);
  const st = useRef({ orbX: 0, orbY: 0, t: 0, prevRow: 0, speed: 0 });

  const trackMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: trackVertex,
        fragmentShader: trackFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uOrbX: { value: 0 },
          uStartX: { value: 0 },
          uEndX: { value: 0 },
          uFade: { value: 1 },
          uHalf: { value: 18 },
          uCenterY: { value: 0 },
        },
      }),
    [],
  );
  const fresnel = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fresnelVertex,
        fragmentShader: fresnelFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color("#ffc4a0") }, uPower: { value: 2 }, uStrength: { value: 1 } },
      }),
    [],
  );
  const haloMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: haloTexture(),
        color: new THREE.Color(1.70, 1.22, 0.85),
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const trailMat = useMemo(() => haloMat.clone(), [haloMat]);
  const stationHaloMat = useMemo(() => {
    const m = haloMat.clone();
    m.color = new THREE.Color(1.60, 1.15, 0.80);
    return m;
  }, [haloMat]);
  const dim = useMemo(() => new THREE.Color("#6b4c38"), []);
  const hot = useMemo(() => new THREE.Color(1.90, 1.37, 0.95), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05);
    const J = journey;
    const W = state.size.width;
    const H = state.size.height;
    const s = st.current;
    s.t += dt;
    const toX = (sx: number) => sx - W / 2;
    const toY = (sy: number) => H / 2 - sy;
    const o = J.outcome;
    const rowFade = 1 - seg(o, 0, 0.18);

    // track
    const ty = toY(J.trackY);
    if (track.current) {
      track.current.position.set(0, ty, -2);
      track.current.scale.set(W * 1.2, 56, 1);
      track.current.visible = rowFade > 0.01;
    }
    const u = trackMat.uniforms;
    u.uTime.value = s.t;
    u.uCenterY.value = ty;
    u.uStartX.value = toX(J.rowX + J.trackStart);
    u.uEndX.value = toX(J.rowX + J.trackEnd);
    u.uOrbX.value = toX(J.rowX + J.orbRowX);
    u.uFade.value = rowFade;

    // stations
    for (let j = 0; j < STATIONS; j++) {
      const g = stations.current[j];
      if (!g) continue;
      const sx = J.rowX + (J.centers[j] ?? 0);
      const on = Math.abs(sx - W / 2) < W / 2 + 120 && rowFade > 0.01;
      g.visible = on;
      if (!on) continue;
      const act = J.active[j] ?? 0;
      const done = J.done[j] ?? 0;
      g.position.set(toX(sx), ty, 0);
      g.scale.setScalar(1 + act * 0.45);
      tmp.copy(dim).lerp(hot, Math.max(done, act));
      (stationRings.current[j]?.material as THREE.MeshBasicMaterial | undefined)?.color.copy(tmp);
      const h = stationHalos.current[j];
      if (h) {
        h.material.opacity = (0.08 + done * 0.25 + act * 0.5) * rowFade;
        h.scale.setScalar(70 + act * 60);
      }
    }

    // icons
    for (let j = 0; j < STATIONS; j++) {
      const g = icons.current[j];
      if (!g) continue;
      const ix = J.rowX + (J.iconX[j] ?? 0);
      const on = Math.abs(ix - W / 2) < W / 2 + 140 && rowFade > 0.01;
      g.visible = on;
      if (!on) continue;
      g.position.set(toX(ix), toY(J.iconY[j] ?? 0), 0);
      g.scale.setScalar((J.iconSize[j] ?? 90) * 0.5 * (0.9 + (J.active[j] ?? 0) * 0.12) * rowFade);
    }

    // orb: travels along the track, then centres and bursts into the outcome
    const move = easeInOutCubic(seg(o, 0.02, 0.22));
    const ox = toX(J.rowX + J.orbRowX) * (1 - move);
    const oy = ty + (toY(H * 0.48) - ty) * move;
    s.orbX = damp(s.orbX, ox, 14, dt);
    s.orbY = damp(s.orbY, oy, 14, dt);
    const charge = seg(o, 0.22, 0.42);
    const gone = 1 - smooth(seg(o, 0.42, 0.47));
    const jitter = charge * (1 - seg(o, 0.4, 0.42)) * 3;
    if (orb.current) {
      orb.current.position.set(s.orbX + (Math.random() - 0.5) * jitter, s.orbY + (Math.random() - 0.5) * jitter, 5);
      orb.current.scale.setScalar((1 + charge * charge * 1.9 + Math.sin(s.t * 3) * 0.04) * gone);
      orb.current.visible = gone > 0.01;
    }
    if (orbHalo.current) orbHalo.current.scale.setScalar(120 + charge * 160);

    // comet tail: stretches behind the orb while it travels along the track
    const v = (J.orbRowX - s.prevRow) / Math.max(dt, 0.001);
    s.prevRow = J.orbRowX;
    s.speed = damp(s.speed, clamp(v, 0, 4000), 10, dt);
    const tail = clamp(s.speed / 700) * gone * (1 - seg(o, 0, 0.1));
    trail.current.forEach((sp, i) => {
      if (!sp) return;
      sp.visible = tail > 0.02;
      sp.position.set(s.orbX - s.speed * 0.014 * (i + 1), s.orbY, 4);
      sp.scale.setScalar(Math.max(4, (40 - i * 6) * (0.4 + 0.6 * tail)));
      sp.material.opacity = (0.55 - i * 0.08) * tail;
    });
  });

  const burstOrigin = (): [number, number, number] => [0, 0, 8];
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    // burst origin follows the orb's final resting point (stage centre, slightly above middle)
    if (g.current) g.current.position.set(0, state.size.height / 2 - state.size.height * 0.48, 8);
  });

  const count = quality === "low" ? 60 : 120;

  return (
    <>
      <ambientLight intensity={1.3} />
      <directionalLight position={[2, 3, 6]} intensity={2.4} color="#fbeee0" />
      <directionalLight position={[-3, -1, 4]} intensity={1.1} color="#e6a4b8" />

      <mesh ref={track} material={trackMat}>
        <planeGeometry args={[1, 1]} />
      </mesh>

      {Array.from({ length: STATIONS }).map((_, j) => (
        <group key={j} ref={(el) => void (stations.current[j] = el)}>
          <sprite ref={(el) => void (stationHalos.current[j] = el)} material={stationHaloMat.clone()} scale={70} />
          <mesh ref={(el) => void (stationRings.current[j] = el)}>
            <torusGeometry args={[11, 2.2, 10, 36]} />
            <meshBasicMaterial color="#6b4c38" toneMapped={false} />
          </mesh>
          <mesh>
            <circleGeometry args={[5, 20]} />
            <meshBasicMaterial color="#fbeee0" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {STEP_ICONS.map((Icon, j) => (
        <group key={j} ref={(el) => void (icons.current[j] = el)} visible={false}>
          <Icon energy={() => journey.active[j] ?? 0} />
        </group>
      ))}

      {Array.from({ length: TRAIL }).map((_, i) => (
        <sprite key={i} ref={(el) => void (trail.current[i] = el)} material={trailMat.clone()} scale={30} />
      ))}
      <group ref={orb}>
        <sprite ref={orbHalo} material={haloMat} scale={120} />
        <mesh>
          <sphereGeometry args={[13, 32, 32]} />
          <meshBasicMaterial color={new THREE.Color(2.60, 1.87, 1.30)} toneMapped={false} />
        </mesh>
        <mesh material={fresnel} scale={1.7}>
          <sphereGeometry args={[13, 24, 24]} />
        </mesh>
      </group>

      <group ref={g} position={burstOrigin()}>
        <Burst count={count} getTime={() => Math.max(0, journey.outcome - 0.42) * 7} scale={560} size={9} seed={77} palette={["#ffc4a0", "#f0b8c8", "#ffffff"]} />
        <Burst count={Math.round(count * 0.6)} getTime={() => Math.max(0, journey.outcome - 0.6) * 7} scale={420} size={7} seed={91} palette={["#d4a373", "#bfe0c2", "#ffffff"]} />
      </group>

    </>
  );
}

export default function JourneyScene({ onReady }: { onReady?: () => void }) {
  return (
    <SceneCanvas
      className="absolute inset-0"
      flat={false}
      orthographic
      camera={{ position: [0, 0, 500], zoom: 1, near: 0.1, far: 2000 }}
      maxDpr={1.25}
      rootMargin="400px"
      onReady={onReady}
    >
      <JourneyWorld />
    </SceneCanvas>
  );
}


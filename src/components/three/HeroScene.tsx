"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import Engine, { type EngineSpin } from "./Engine";
import { Dust, Stream } from "./Points";
import FlowSprites from "./FlowSprites";
import StaticEngine from "./StaticEngine";
import Postfx from "./Postfx";
import { clamp, damp } from "./math";
import { pointer } from "./pointer";
import { useQualitySettings } from "@/hooks/useQuality";

/**
 * Responsive placement shared by the hero and the (calmer) form engine.
 * Returns the world-space centre and scale of the engine for the current viewport.
 */
function layout(viewportW: number, viewportH: number, widthPx: number, calm: boolean) {
  const wide = widthPx >= 1024;
  if (calm) {
    const scale = clamp((viewportW * (wide ? 0.62 : 0.95)) / 8.4, 0.34, 1.3);
    return { scale, x: wide ? viewportW * 0.1 : 0, y: wide ? 0 : -viewportH * 0.12, wide };
  }
  const scale = clamp((viewportW * (wide ? 0.6 : 1.05)) / 8.6, 0.3, 1.15);
  return { scale, x: wide ? viewportW * 0.22 : 0, y: wide ? -0.1 : -viewportH * 0.2, wide };
}

type WorldProps = { calm?: boolean; spin?: EngineSpin; getTarget?: () => number };

export function EngineWorld({ calm = false, spin: external, getTarget }: WorldProps) {
  const { quality, ambient } = useQualitySettings();
  const still = quality === "static";
  const [spin] = useState<EngineSpin>(() => external ?? { v: 1 });
  const rig = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const inLen = useRef(8);
  const outLen = useRef(8);
  const st = useRef({ t: 0, px: 0, py: 0 });

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.1);
    const s = st.current;
    s.t += dt;
    const idleX = still ? 0 : Math.sin(s.t * 0.33) * 0.35;
    const idleY = still ? 0 : Math.cos(s.t * 0.27) * 0.25;
    s.px = damp(s.px, pointer.active ? pointer.x : idleX, 3, dt);
    s.py = damp(s.py, pointer.active ? pointer.y : idleY, 3, dt);

    if (getTarget) spin.v = damp(spin.v, getTarget(), 2.2, dt);
    else spin.v = 1;

    const { viewport, size } = state;
    const L = layout(viewport.width, viewport.height, size.width, calm);
    inLen.current = (viewport.width / 2 + L.x) / L.scale + 1.2;
    outLen.current = (viewport.width / 2 - L.x) / L.scale + 1.2;

    const rg = rig.current;
    if (rg) {
      rg.scale.setScalar(L.scale);
      rg.position.set(L.x - s.px * 0.15, L.y - s.py * 0.1, 0);
    }
    const tg = tilt.current;
    if (tg) {
      // rings lean toward the cursor
      tg.rotation.y = -0.18 + s.px * 0.32;
      tg.rotation.z = 0.04 + s.py * 0.22;
      tg.rotation.x = Math.sin(s.t * 0.21) * 0.06;
    }
    // camera parallax
    state.camera.position.x = damp(state.camera.position.x, s.px * 0.55, 2.5, dt);
    state.camera.position.y = damp(state.camera.position.y, s.py * 0.35, 2.5, dt);
    state.camera.lookAt(0, 0, 0);
  });

  const flowCount = quality === "low" ? 90 : quality === "medium" ? 140 : 200;

  return (
    <>
      <Dust count={ambient} extent={[11, 6, 5]} z={-1} size={calm ? 0.9 : 1.1} drift={0.7} opacity={calm ? 0.7 : 1} seed={11} />
      <group ref={rig}>
        <group ref={tilt}>
          <Engine spin={spin} detail={quality !== "low"} lit={quality !== "low"} />
        </group>
        <Stream
          count={flowCount}
          mode="in"
          getLen={() => inLen.current}
          getSpeed={() => (calm ? 0.8 : 1) * spin.v}
          spread={calm ? 1.3 : 1.7}
          size={calm ? 0.8 : 1}
          seed={21}
          palette={["#d4a373", "#ffc4a0", "#f0b8c8"]}
        />
        <Stream
          count={Math.round(flowCount * 0.4)}
          mode="out"
          getLen={() => outLen.current}
          getSpeed={() => (calm ? 0.8 : 1) * spin.v}
          size={calm ? 0.8 : 1}
          seed={55}
          palette={["#ffc4a0", "#bfe0c2", "#ffffff"]}
        />
        {quality !== "low" && (
          <>
            <FlowSprites mode="clicks" count={calm ? 4 : 7} getLen={() => inLen.current} getSpeed={() => spin.v} size={0.95} seed={4} />
            <FlowSprites mode="calendars" count={calm ? 4 : 6} getLen={() => outLen.current} getSpeed={() => spin.v} size={1.05} seed={9} />
          </>
        )}
        {quality === "low" && (
          <FlowSprites mode="calendars" count={3} getLen={() => outLen.current} getSpeed={() => spin.v} size={1.05} seed={9} />
        )}
      </group>
      <Postfx quality={quality} strength={calm ? 0.8 : 1} />
    </>
  );
}

export default function HeroScene() {
  return (
    <SceneCanvas
      eager
      flat={false}
      className="absolute inset-0"
      camera={{ position: [0, 0, 11], fov: 38 }}
      maxDpr={1.25}
      fallback={<StaticEngine className="absolute inset-0" />}
    >
      <EngineWorld />
    </SceneCanvas>
  );
}

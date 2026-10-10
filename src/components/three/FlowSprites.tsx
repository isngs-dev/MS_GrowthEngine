"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { calendarTexture, cursorTexture } from "./textures";
import { mulberry32, smooth } from "./math";

type Props = {
  mode: "clicks" | "calendars";
  count: number;
  getLen: () => number;
  getSpeed?: () => number;
  seed?: number;
  /** Base sprite size in local units. */
  size?: number;
};

/**
 * Icons riding the streams: cursor "clicks" travelling in towards the engine,
 * glowing calendar cards (booked calls) leaving it.
 */
export default function FlowSprites({ mode, count, getLen, getSpeed, seed = 3, size = 0.8 }: Props) {
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  const t = useRef(0);

  const { items, mat } = useMemo(() => {
    const rand = mulberry32(seed);
    const items = Array.from({ length: count }, (_, i) => ({
      phase: i / count + rand() * 0.04,
      y: (rand() - 0.5) * 2,
      z: (rand() - 0.5) * 1.4,
      speed: 0.85 + rand() * 0.3,
      rot: (rand() - 0.5) * 0.5,
    }));
    const mat = new THREE.SpriteMaterial({
      map: mode === "clicks" ? cursorTexture() : calendarTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      color: mode === "clicks" ? new THREE.Color(1, 1, 1) : new THREE.Color(1.1, 1.15, 1.15),
    });
    return { items, mat };
  }, [count, mode, seed]);

  useFrame((_, dt) => {
    const sp = getSpeed ? getSpeed() : 1;
    t.current += Math.min(dt, 0.05) * sp;
    const len = getLen();
    items.forEach((it, i) => {
      const s = refs.current[i];
      if (!s) return;
      const u = (it.phase + (t.current * 0.075 * it.speed * 7) / len) % 1;
      if (mode === "clicks") {
        const k = smooth(u);
        s.position.set(-len + (len - 0.9) * u, it.y * 1.5 * (1 - k * 0.85), it.z * (1 - k));
        const sc = size * 0.6 * (0.7 + 0.5 * Math.sin(u * Math.PI)) * (1 - smooth((u - 0.8) / 0.2) * 0.9);
        s.scale.setScalar(sc);
        s.material.opacity = Math.min(1, u * 8) * (1 - smooth((u - 0.85) / 0.15)) * 0.9;
      } else {
        const k = smooth(u);
        s.position.set(0.95 + (len - 0.95) * u, it.y * 0.9 * k, it.z * k);
        const sc = size * Math.min(1, u * 5) * (0.85 + 0.35 * Math.sin(u * Math.PI));
        s.scale.setScalar(sc);
        s.material.opacity = Math.min(1, u * 6) * (1 - smooth((u - 0.88) / 0.12));
        s.material.rotation = it.rot * k;
      }
    });
  });

  return (
    <group>
      {items.map((_, i) => (
        <sprite key={i} ref={(el) => void (refs.current[i] = el)} material={mat.clone()} />
      ))}
    </group>
  );
}

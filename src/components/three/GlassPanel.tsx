"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { glassFragment, glassVertex } from "./shaders";

type Props = {
  width: number;
  height: number;
  radius?: number;
  tintA?: string;
  tintB?: string;
  fill?: number;
  edge?: number;
  position?: [number, number, number];
  /** Per-frame opacity (0..1). Defaults to fully visible. */
  getOpacity?: () => number;
  renderOrder?: number;
};

/** Frosted glass rounded-rect panel (SDF shader: crisp edge, inner glow, moving sheen). */
export default function GlassPanel({
  width,
  height,
  radius = 0.16,
  tintA = "#9c6b4a",
  tintB = "#3a281b",
  fill = 0.3,
  edge = 0.6,
  position = [0, 0, 0],
  getOpacity,
  renderOrder = 0,
}: Props) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glassVertex,
        fragmentShader: glassFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uSize: { value: new THREE.Vector2(width, height) },
          uRadius: { value: radius },
          uOpacity: { value: getOpacity ? 0 : 1 },
          uTime: { value: 0 },
          uFill: { value: fill },
          uEdge: { value: edge },
          uTintA: { value: new THREE.Color(tintA) },
          uTintB: { value: new THREE.Color(tintB) },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height, radius, tintA, tintB, fill, edge],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    if (getOpacity) material.uniforms.uOpacity.value = getOpacity();
  });

  return (
    <mesh position={position} material={material} renderOrder={renderOrder}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}

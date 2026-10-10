"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "./math";
import { burstVertex, dustVertex, softPointFragment, streamVertex } from "./fx";

type Palette = [string, string, string];

function randAttr(count: number, seed: number) {
  const rand = mulberry32(seed);
  const a = new Float32Array(count * 4);
  for (let i = 0; i < a.length; i++) a[i] = rand();
  return a;
}

function pointMaterial(vertexShader: string, uniforms: Record<string, THREE.IUniform>, palette: Palette) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: softPointFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColorA: { value: new THREE.Color(palette[0]) },
      uColorB: { value: new THREE.Color(palette[1]) },
      uColorC: { value: new THREE.Color(palette[2]) },
      uOpacity: { value: 1 },
      uPixelRatio: { value: 1 },
      ...uniforms,
    },
  });
}

type DustProps = {
  count: number;
  /** Half extents of the box the dust fills. */
  extent: [number, number, number];
  /** z offset of the box centre. */
  z?: number;
  size?: number;
  drift?: number;
  opacity?: number;
  seed?: number;
  palette?: Palette;
};

/** Ambient floating particles filling a box. */
export function Dust({ count, extent, z = 0, size = 1, drift = 0.6, opacity = 1, seed = 5, palette = ["#d4a373", "#ffc4a0", "#f0b8c8"] }: DustProps) {
  const gl = useThree((s) => s.gl);
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(seed + 1000);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() * 2 - 1) * extent[0];
      pos[i * 3 + 1] = (rand() * 2 - 1) * extent[1];
      pos[i * 3 + 2] = z + (rand() * 2 - 1) * extent[2];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(randAttr(count, seed), 4));
    const m = pointMaterial(dustVertex, { uTime: { value: 0 }, uSize: { value: size }, uDrift: { value: drift }, uFocus: { value: 11 }, uRange: { value: 7 } }, palette);
    return { geometry: g, material: m };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, extent[0], extent[1], extent[2], z, seed]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uSize.value = size;
    u.uDrift.value = drift;
    u.uOpacity.value = opacity;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

type StreamProps = {
  count: number;
  mode: "in" | "out";
  /** Length of the stream in local units; read each frame. */
  getLen: () => number;
  getSpeed?: () => number;
  /** Radius the inbound stream starts from. */
  spread?: number;
  size?: number;
  seed?: number;
  palette?: Palette;
};

/** Light particles flowing along the x axis: converging into the engine, or leaving it. */
export function Stream({ count, mode, getLen, getSpeed, spread = 1.5, size = 1, seed = 21, palette = ["#d4a373", "#ffc4a0", "#f0b8c8"] }: StreamProps) {
  const gl = useThree((s) => s.gl);
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(randAttr(count, seed), 4));
    const m = pointMaterial(
      streamVertex,
      {
        uTime: { value: 0 },
        uSize: { value: size },
        uLen: { value: 8 },
        uSpeed: { value: 1 },
        uMode: { value: mode === "in" ? 0 : 1 },
        uSpread: { value: spread },
      },
      palette,
    );
    return { geometry: g, material: m };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, mode, seed]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uSize.value = size;
    u.uLen.value = Math.max(2, getLen());
    u.uSpeed.value = getSpeed ? getSpeed() : 1;
    u.uSpread.value = spread;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

type BurstProps = {
  count: number;
  /** Seconds since the burst fired; <= 0 hides it. Read each frame. */
  getTime: () => number;
  scale?: number;
  size?: number;
  seed?: number;
  palette?: Palette;
};

/** One-shot radial particle burst used for celebrations. */
export function Burst({ count, getTime, scale = 6, size = 1.4, seed = 77, palette = ["#ffc4a0", "#f0b8c8", "#ffffff"] }: BurstProps) {
  const gl = useThree((s) => s.gl);
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(seed);
    const r = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      r[i * 4] = rand() * Math.PI * 2;
      r[i * 4 + 1] = Math.acos(1 - 2 * rand());
      r[i * 4 + 2] = 0.35 + rand() * 0.65;
      r[i * 4 + 3] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(r, 4));
    const m = pointMaterial(burstVertex, { uT: { value: 0 }, uSize: { value: size }, uScale: { value: scale } }, palette);
    return { geometry: g, material: m };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, seed]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const u = material.uniforms;
    u.uT.value = getTime();
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uSize.value = size;
    u.uScale.value = scale;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

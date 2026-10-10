"use client";

import { Component, useEffect, useRef, useState, useSyncExternalStore, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useThree, type CanvasProps } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useQualitySettings } from "@/hooks/useQuality";
import { attachPointer } from "./pointer";

let webglSupport: boolean | undefined;

/**
 * Feature-detect WebGL once. The result is cached because this runs as a
 * useSyncExternalStore snapshot (called on every render), and each probe would
 * otherwise leak a WebGL context until the browser starts evicting real ones.
 */
function hasWebGL() {
  if (webglSupport !== undefined) return webglSupport;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
    webglSupport = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

const noopSubscribe = () => () => {};

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[3D scene] failed, showing fallback", error, info.componentStack);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Re-renders a demand-mode canvas at a fixed rate (used for faint background scenes). */
function FrameLimiter({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

type Props = {
  children: ReactNode;
  className?: string;
  camera?: CanvasProps["camera"];
  /** Mount immediately instead of waiting until the section nears the viewport. */
  eager?: boolean;
  /** How far outside the viewport (px) before the canvas starts mounting. */
  rootMargin?: string;
  /** Rendered while the canvas is not mounted yet or when WebGL is unavailable. */
  fallback?: ReactNode;
  /** Tone mapping off (flat) keeps shader colours exact. Turn off for PBR scenes. */
  flat?: boolean;
  /** Cap the render rate (e.g. 30 for a faint backdrop). Omit for full speed. */
  maxFps?: number;
  /** Cap the pixel ratio below the quality tier's own limit. */
  maxDpr?: number;
  /** Orthographic camera (1 world unit = 1 css px when zoom is 1). */
  orthographic?: boolean;
  /** Called once the WebGL context exists. */
  onReady?: () => void;
};

/**
 * Shared shell for every 3D canvas on the page:
 *  - lazy mount via IntersectionObserver (keeps first load light)
 *  - pauses rendering while off-screen
 *  - quality-aware DPR; static "demand" rendering for reduced motion
 *  - WebGL feature check + error boundary with CSS fallback
 */
export default function SceneCanvas({
  children,
  className,
  camera = { position: [0, 0, 11], fov: 38 },
  eager = false,
  rootMargin = "600px",
  fallback = null,
  flat = true,
  maxFps,
  maxDpr,
  orthographic = false,
  onReady,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const { quality, dpr } = useQualitySettings();
  const [mounted, setMounted] = useState(eager);
  const [visible, setVisible] = useState(eager);
  // true on the server and until the client can check; then the real answer
  const supported = useSyncExternalStore(noopSubscribe, hasWebGL, () => true);

  useEffect(() => {
    attachPointer();
  }, []);

  // Two observers: one with a generous margin mounts the canvas early (so it is
  // ready before the user arrives), one with a tight margin runs the render loop
  // only while the scene is actually on, or about to be on, screen.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const mountIO = new IntersectionObserver(
      ([entry]) => {
        // free the WebGL context again once the section is well out of range
        setMounted(entry.isIntersecting);
      },
      { rootMargin },
    );
    const runIO = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px" });
    mountIO.observe(el);
    runIO.observe(el);
    return () => {
      mountIO.disconnect();
      runIO.disconnect();
    };
  }, [rootMargin]);

  // Adaptive resolution: drei's PerformanceMonitor lowers the pixel ratio when the
  // measured frame rate drops (weak GPUs, battery saver) and raises it again when it recovers.
  const [factor, setFactor] = useState(1);
  const dprMin = dpr[0];
  const dprMax = Math.min(dpr[1], maxDpr ?? dpr[1]);
  const adaptiveDpr: [number, number] = [dprMin, Math.max(dprMin, dprMin + (dprMax - dprMin) * factor)];

  const limited = !!maxFps && quality !== "static";
  const frameloop: CanvasProps["frameloop"] =
    quality === "static" ? "demand" : !visible ? "never" : limited ? "demand" : "always";

  return (
    <div ref={host} className={className} data-quality={quality}>
      {mounted && supported ? (
        <SceneBoundary fallback={fallback}>
          <Canvas
            frameloop={frameloop}
            dpr={adaptiveDpr}
            camera={camera}
            orthographic={orthographic}
            flat={flat}
            onCreated={() => onReady?.()}
            gl={{ antialias: quality === "high", alpha: true, powerPreference: "high-performance" }}
            style={{ pointerEvents: "none" }}
            aria-hidden
          >
            <PerformanceMonitor factor={1} step={0.2} flipflops={6} onChange={({ factor: f }) => setFactor(f)}>
              {limited && <FrameLimiter fps={maxFps} />}
              {children}
            </PerformanceMonitor>
          </Canvas>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}

"use client";

import SceneCanvas from "./SceneCanvas";
import StaticEngine from "./StaticEngine";
import { EngineWorld } from "./HeroScene";
import { formState } from "./progress";

/** The hero engine again, calmer: it spins faster as more of the form is filled in. */
const target = () => 0.32 + formState.filled * 2.3;

export default function FormScene() {
  return (
    <SceneCanvas
      className="absolute inset-0"
      flat={false}
      camera={{ position: [0, 0, 11], fov: 38 }}
      maxDpr={1}
      rootMargin="250px"
      maxFps={30}
      fallback={<StaticEngine className="absolute inset-0" />}
    >
      <EngineWorld calm getTarget={target} />
    </SceneCanvas>
  );
}

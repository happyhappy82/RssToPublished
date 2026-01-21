"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface VantaEffect {
  destroy: () => void;
}

export default function VantaBackground() {
  const vantaRef = useRef<HTMLDivElement>(null);
  const [vantaEffect, setVantaEffect] = useState<VantaEffect | null>(null);

  useEffect(() => {
    const loadVanta = async () => {
      if (vantaEffect) return;

      // Dynamically import vanta
      const VANTA_MODULE = await import("vanta/dist/vanta.clouds2.min");

      if (vantaRef.current && !vantaEffect) {
        const effect = VANTA_MODULE.default({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          backgroundColor: 0x0f172a,
          skyColor: 0x0f766e,
          cloudColor: 0x1e3a5f,
          cloudShadowColor: 0x0f172a,
          sunColor: 0x14b8a6,
          sunGlareColor: 0x2dd4bf,
          sunlightColor: 0x5eead4,
          speed: 0.8,
        });
        setVantaEffect(effect);
      }
    };

    loadVanta();

    return () => {
      if (vantaEffect) {
        vantaEffect.destroy();
      }
    };
  }, [vantaEffect]);

  return (
    <div
      ref={vantaRef}
      className="fixed inset-0 -z-10"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

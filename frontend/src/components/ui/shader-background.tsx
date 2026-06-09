"use client";

import { MeshGradient } from "@paper-design/shaders-react";

export function ShaderBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <MeshGradient
        style={{ width: "100%", height: "100%" }}
        speed={0.15}
        colors={["#050505", "#0a0a0a", "#1a1a2e", "#16213e"]}
      />
    </div>
  );
}

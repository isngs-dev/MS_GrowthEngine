import * as THREE from "three";

/** Small procedural canvas textures (no image requests, tiny, crisp enough for sprites). */

function make(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const cache = new Map<string, THREE.CanvasTexture>();
function cached(key: string, build: () => THREE.CanvasTexture) {
  let t = cache.get(key);
  if (!t) {
    t = build();
    cache.set(key, t);
  }
  return t;
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Soft radial halo, white; tint through the sprite material colour. */
export function haloTexture() {
  return cached("halo", () =>
    make(128, (g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.25, "rgba(255,255,255,0.45)");
      gr.addColorStop(0.6, "rgba(255,255,255,0.1)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, s, s);
    }),
  );
}

/** Glowing calendar / appointment card with a check mark: a "booked call". */
export function calendarTexture() {
  return cached("calendar", () =>
    make(256, (g, s) => {
      const pad = 34;
      const w = s - pad * 2;
      g.shadowColor = "rgba(255,196,160,0.95)";
      g.shadowBlur = 26;
      rr(g, pad, pad + 8, w, w - 8, 26);
      g.fillStyle = "rgba(42,28,19,0.92)";
      g.fill();
      g.lineWidth = 6;
      g.strokeStyle = "#bfe0c2";
      g.stroke();
      g.shadowBlur = 0;
      // header band
      g.save();
      rr(g, pad, pad + 8, w, w - 8, 26);
      g.clip();
      const hg = g.createLinearGradient(pad, 0, pad + w, 0);
      hg.addColorStop(0, "#d4a373");
      hg.addColorStop(1, "#ffc4a0");
      g.fillStyle = hg;
      g.fillRect(pad, pad + 8, w, 44);
      g.restore();
      // rings
      g.fillStyle = "#fff1e4";
      for (const x of [0.28, 0.72]) {
        rr(g, pad + w * x - 7, pad - 6, 14, 30, 7);
        g.fill();
      }
      // grid
      g.fillStyle = "rgba(240,215,190,0.55)";
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          if (r === 1 && c === 2) continue;
          rr(g, pad + 26 + c * 38, pad + 76 + r * 34, 22, 18, 5);
          g.fill();
        }
      }
      // highlighted, checked slot
      const x = pad + 26 + 2 * 38;
      const y = pad + 76 + 34;
      g.fillStyle = "#a8d5ba";
      g.shadowColor = "#a8d5ba";
      g.shadowBlur = 18;
      rr(g, x - 3, y - 3, 28, 24, 7);
      g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = "#2a160c";
      g.lineWidth = 5;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(x + 4, y + 9);
      g.lineTo(x + 10, y + 15);
      g.lineTo(x + 20, y + 3);
      g.stroke();
    }),
  );
}

/** A "click": pointer arrow with a ripple ring. */
export function cursorTexture() {
  return cached("cursor", () =>
    make(128, (g, s) => {
      g.strokeStyle = "rgba(232,195,158,0.9)";
      g.lineWidth = 3;
      g.shadowColor = "rgba(212,163,115,1)";
      g.shadowBlur = 14;
      g.beginPath();
      g.arc(s * 0.4, s * 0.38, s * 0.3, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(s * 0.4, s * 0.38, s * 0.16, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#ffffff";
      g.shadowColor = "rgba(255,196,160,1)";
      g.shadowBlur = 16;
      g.beginPath();
      g.moveTo(s * 0.4, s * 0.3);
      g.lineTo(s * 0.4, s * 0.86);
      g.lineTo(s * 0.54, s * 0.72);
      g.lineTo(s * 0.66, s * 0.96);
      g.lineTo(s * 0.74, s * 0.92);
      g.lineTo(s * 0.62, s * 0.68);
      g.lineTo(s * 0.8, s * 0.66);
      g.closePath();
      g.fill();
    }),
  );
}

/** LinkedIn-style "in" badge (generic professional-network look, not the trademark artwork). */
export function networkBadgeTexture() {
  return cached("network-badge", () =>
    make(128, (g, s) => {
      rr(g, 8, 8, s - 16, s - 16, 24);
      g.fillStyle = "#c98a6b";
      g.fill();
      g.fillStyle = "#ffffff";
      g.font = "700 74px 'Arial', 'Helvetica', sans-serif";
      g.textAlign = "center";
      g.textBaseline = "alphabetic";
      g.fillText("in", s / 2, s * 0.72);
    }),
  );
}

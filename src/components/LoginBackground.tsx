import { useEffect, useRef } from 'react';
import '../styles/login-background.css';

export const LoginBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina support — cap at 2× to avoid memory pressure
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;

    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // Stellar density: ~1 star per 1 400 px² of viewport
    const count = Math.floor((W * H) / 1400);

    for (let i = 0; i < count; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;

      // Size — heavily weighted toward sub-pixel (feels photographic, not painted)
      const t = Math.random();
      const radius =
        t < 0.62 ? Math.random() * 0.22 + 0.08   // 62 %: 0.08–0.30 px
        : t < 0.86 ? Math.random() * 0.28 + 0.30  // 24 %: 0.30–0.58 px
        : t < 0.96 ? Math.random() * 0.35 + 0.58  // 10 %: 0.58–0.93 px
        : Math.random() * 0.45 + 0.93;             //  4 %: 0.93–1.38 px

      // Opacity — most stars barely visible; collective texture > individual dots
      const op =
        Math.random() < 0.58
          ? Math.random() * 0.22 + 0.04  // 58 %: nearly invisible
          : Math.random() < 0.80
          ? Math.random() * 0.28 + 0.26  // ~29 %: faint
          : Math.random() * 0.35 + 0.54; //  ~13 %: visible

      // Color temperature — mostly blue-white, occasional warm or deep blue
      const cr = Math.random();
      let r: number, g: number, b: number;
      if (cr < 0.52) {
        // Blue-white (hot stars)
        r = 200 + Math.random() * 35;
        g = 218 + Math.random() * 22;
        b = 255;
      } else if (cr < 0.74) {
        // Pure white
        r = 255; g = 255; b = 255;
      } else if (cr < 0.90) {
        // Warm yellow-white
        r = 255;
        g = 242 + Math.random() * 10;
        b = 200 + Math.random() * 35;
      } else {
        // Deep blue
        r = 155 + Math.random() * 45;
        g = 185 + Math.random() * 35;
        b = 255;
      }

      const R = Math.round(r);
      const G = Math.round(g);
      const B = Math.round(b);

      // Draw star core
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${R},${G},${B},${op.toFixed(3)})`;
      ctx.fill();

      // Diffraction glow — only for brighter, larger stars (~7 % of field)
      if (radius > 0.80 && op > 0.45) {
        const glow = radius * 3.5;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, glow);
        grd.addColorStop(0, `rgba(${R},${G},${B},${(op * 0.18).toFixed(3)})`);
        grd.addColorStop(1, `rgba(${R},${G},${B},0)`);
        ctx.beginPath();
        ctx.arc(x, y, glow, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }
    }

    // ── Grain pass: cinematic film texture
    // Added after stars so grain sits on top — identical to photographic emulsion.
    // Star parameters above are untouched; this is a separate texture pass.
    // ~0.75% pixel density × 0.7–2.8% alpha = barely perceptible individually,
    // but collectively reads as photographic grain.
    const grainCount = Math.floor(W * H * 0.0075);
    for (let i = 0; i < grainCount; i++) {
      const gx = Math.random() * W;
      const gy = Math.random() * H;
      const lum = Math.floor(145 + Math.random() * 110); // neutral → near-white
      const ga  = +(0.007 + Math.random() * 0.021).toFixed(3); // 0.7–2.8 %
      ctx.fillStyle = `rgba(${lum},${lum},${lum},${ga})`;
      ctx.fillRect(Math.floor(gx), Math.floor(gy), 1, 1);
    }

    // Canvas is now a static GPU texture — zero CPU cost from this point
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {/* ── Layer 1: Deep space base
            Asymmetric diagonal gradient — not centered, never looks like CSS */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(158deg, #020408 0%, #040810 28%, #060c1a 52%, #04080f 76%, #020407 100%)',
        }}
      />

      {/* ── Layer 2: Stellar field canvas — drawn once, static thereafter */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ display: 'block' }}
      />

      {/* ── Layer 3: Nebulae — two asymmetric elliptical clouds, breathing slowly

            Upper-right cloud: wider than tall, pushed off-center
            Creates the illusion of a distant galactic arm                     */}
      <div
        className="nebula-a absolute"
        style={{
          width: '90vw',
          height: '71vh',
          top: '-12vh',
          right: '-10vw',
          background:
            'radial-gradient(ellipse 68% 58% at 62% 42%, rgba(48,72,200,0.065) 0%, rgba(28,48,145,0.035) 45%, transparent 72%)',
        }}
      />

      {/* Lower-left cloud: quieter, slightly warmer blue */}
      <div
        className="nebula-b absolute"
        style={{
          width: '78vw',
          height: '67vh',
          bottom: '-8vh',
          left: '-14vw',
          background:
            'radial-gradient(ellipse 62% 52% at 38% 56%, rgba(42,58,178,0.048) 0%, rgba(18,36,115,0.025) 48%, transparent 72%)',
        }}
      />

      {/* ── Center nebula cloud — three asymmetric components that together
            form an organic, non-circular violet-blue mass behind the card.
            No single component reads as "CSS gradient"; the overlap makes it
            feel photographed rather than rendered.                            */}

      {/* Component A: violet core, shifted upper-left of center */}
      <div
        className="nebula-center-a absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 59% 49% at 46% 47%, rgba(78,38,205,0.088) 0%, rgba(50,25,160,0.047) 42%, transparent 68%)',
        }}
      />
      {/* Component B: blue-indigo, shifted lower-right */}
      <div
        className="nebula-center-b absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 54% 63% at 55% 54%, rgba(32,55,195,0.074) 0%, rgba(20,38,148,0.037) 45%, transparent 70%)',
        }}
      />
      {/* Component C: wide violet wash — smooths edges between the two cores */}
      <div
        className="nebula-center-a absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 76% 57% at 50% 50%, rgba(62,28,185,0.050) 0%, transparent 72%)',
          animationDelay: '14s',
        }}
      />

      {/* ── Layer 4: Light streaks — diagonal atmospheric scattering
            Not moving. Just breathing. Nothing should streak across the screen. */}
      <div
        className="streak-a absolute"
        style={{
          width: '140vw',
          height: '1px',
          top: '29%',
          left: '-20vw',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(85,115,255,0.055) 28%, rgba(105,135,255,0.085) 50%, rgba(85,115,255,0.055) 72%, transparent 100%)',
          filter: 'blur(18px)',
          transform: 'rotate(-7deg)',
          transformOrigin: 'center center',
        }}
      />
      <div
        className="streak-b absolute"
        style={{
          width: '115vw',
          height: '1px',
          top: '67%',
          left: '8vw',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(65,95,215,0.045) 32%, rgba(85,115,235,0.068) 50%, rgba(65,95,215,0.045) 68%, transparent 100%)',
          filter: 'blur(14px)',
          transform: 'rotate(4deg)',
          transformOrigin: 'center center',
        }}
      />

      {/* ── Layer 5: Edge vignette — the most important depth trick
            Edges recede to near-black; center remains open.
            Makes the card appear suspended in illuminated space,
            not placed on top of a background.                                 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 115% 115% at 50% 50%, transparent 30%, rgba(1,2,5,0.42) 68%, rgba(1,2,5,0.82) 100%)',
        }}
      />
    </div>
  );
};

import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';

/**
 * Animated particle constellation. Renders into an absolutely-positioned
 * canvas inside the parent (so it can scope to a hero or fill the screen).
 * Lines connect nearby particles; a faint cursor attractor adds life.
 */
export function ParticleField({ density = 60, className = 'absolute inset-0 -z-10' }) {
  const ref = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let raf = 0;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas.parentElement;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(w, h);
    };

    const seed = (w, h) => {
      const n = Math.round((density * (w * h)) / (1280 * 720));
      particles = Array.from({ length: Math.max(24, n) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.4,
      }));
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    const tick = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const pointColor = isDark ? 'rgba(255, 153, 0, 0.85)' : 'rgba(255, 153, 0, 0.6)';
      const lineColor  = isDark ? '0, 212, 255' : '15, 23, 42';

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const f = (1 - d2 / (140 * 140)) * 0.04;
          p.vx += dx * f * 0.02;
          p.vy += dy * f * 0.02;
        }
        // friction
        p.vx *= 0.985; p.vy *= 0.985;

        ctx.beginPath();
        ctx.fillStyle = pointColor;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // links
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const o = 1 - d2 / (120 * 120);
            ctx.strokeStyle = `rgba(${lineColor}, ${o * 0.35})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    resize();
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [density, isDark]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

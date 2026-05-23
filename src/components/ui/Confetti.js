import confetti from 'canvas-confetti';

// AWS-branded confetti burst — call from anywhere on celebrations.
export function fireConfetti(opts = {}) {
  const defaults = {
    spread: 70,
    startVelocity: 45,
    decay: 0.92,
    scalar: 1.1,
    colors: ['#FF9900', '#FFB84D', '#00D4FF', '#7C3AED', '#00C853'],
  };

  const count = 200;
  const fire = (ratio, override) =>
    confetti({ ...defaults, ...override, particleCount: Math.floor(count * ratio), ...opts });

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.9, scalar: 0.9 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

export function sideCannons() {
  const end = Date.now() + 800;
  const colors = ['#FF9900', '#00D4FF'];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

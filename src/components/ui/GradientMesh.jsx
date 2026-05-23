// Slowly shifting gradient mesh background. Lives behind ParticleField.
export function GradientMesh() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh animate-mesh-shift" />
      <div className="absolute inset-0 bg-gradient-mesh opacity-60 animate-mesh-shift" style={{ animationDelay: '-9s' }} />
      <div className="absolute inset-0 backdrop-blur-2xl" />
    </div>
  );
}

/**
 * Three-dot "AI is thinking" indicator.
 */
export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-aws-orange animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-aws-orange animate-bounce" style={{ animationDelay: '120ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-aws-orange animate-bounce" style={{ animationDelay: '240ms' }} />
    </span>
  );
}

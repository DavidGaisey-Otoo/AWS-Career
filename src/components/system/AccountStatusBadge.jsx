/**
 * AccountStatusBadge.jsx — always-visible header chip showing the user's
 * current AWS account tier. Three states + unknown:
 *
 *   🟢 Free Tier Active — XX days left
 *   🟠 Free Tier Expired — Always Free only
 *   💳 Credits — $XX.XX remaining
 *   ⚪ Not linked
 *
 * Clicking the badge opens AWS Account Manager.
 */
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, CreditCard, Cloud } from 'lucide-react';
import { useAWS } from '../../context/AWSContext.jsx';
import { classifyAccount } from '../../lib/accountTier.js';
import { cn } from '../../lib/utils.js';

const STYLES = {
  A: {
    icon: CheckCircle2,
    cls: 'bg-success/15 text-success border-success/30 hover:bg-success/25',
  },
  B: {
    icon: AlertTriangle,
    cls: 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/25',
  },
  C: {
    icon: CreditCard,
    cls: 'bg-electric/15 text-electric border-electric/30 hover:bg-electric/25',
  },
  UNKNOWN: {
    icon: Cloud,
    cls: 'bg-[var(--card-2)] text-muted border-token hover:bg-[var(--card)]',
  },
};

export function AccountStatusBadge({ compact = false }) {
  const aws = useAWS();
  const activeProfile = aws?.activeProfile;
  const classification = classifyAccount(activeProfile);
  const style = STYLES[classification.type] || STYLES.UNKNOWN;
  const Icon = style.icon;

  let summary = classification.meta.label;
  if (classification.type === 'A' && classification.daysLeft != null) {
    summary = `${classification.meta.label} · ${classification.daysLeft}d left`;
  } else if (classification.type === 'C' && classification.creditsRemaining != null) {
    summary = `Credits: $${classification.creditsRemaining.toFixed(2)}`;
  } else if (classification.type === 'B') {
    summary = 'Free Tier Expired';
  }

  return (
    <Link
      to="/aws-accounts"
      title={classification.reason}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition focus-ring',
        style.cls
      )}
    >
      <Icon size={11} strokeWidth={2.5} />
      {!compact && <span>{summary}</span>}
      {compact && <span className="hidden sm:inline">{summary}</span>}
    </Link>
  );
}

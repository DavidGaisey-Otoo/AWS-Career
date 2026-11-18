import { IncomeTrackerCard } from '../income/IncomeTrackerCard.jsx';
import { EarningsTracker } from '../freelance/EarningsTracker.jsx';

/** Money → Earnings: this month against the goal, then every payment. */
export function MoneyOverview() {
  return (
    <div className="space-y-6">
      <IncomeTrackerCard />
      <EarningsTracker />
    </div>
  );
}

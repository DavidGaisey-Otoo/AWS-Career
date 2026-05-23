import { Award } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { PageScaffold } from './PageScaffold.jsx';

export default function Certifications() {
  return (
    <PageScaffold
      eyebrow="Certifications"
      title="Track every cert, end-to-end"
      subtitle="Plan, schedule, study for, and showcase your AWS certifications in one place."
      icon={Award}
      features={[
        'All 12 AWS certifications mapped end-to-end',
        'Exam scheduling assistant (Pearson VUE integration)',
        'Renewal & recert reminders',
        'Shareable verified badges',
        'Cost & ROI estimator per cert',
      ]}
      actions={<Button>Pick your cert</Button>}
    />
  );
}

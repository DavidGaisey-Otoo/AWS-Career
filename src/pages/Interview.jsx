import { Mic } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { PageScaffold } from './PageScaffold.jsx';

export default function Interview() {
  return (
    <PageScaffold
      eyebrow="Interview Prep"
      title="Rehearse like the real thing"
      subtitle="Voice-powered mock interviews — behavioral, system design, and AWS deep-dive — with rubric feedback."
      icon={Mic}
      features={[
        'STAR-method behavioral coaching',
        'Live system-design whiteboard mode',
        'AWS service deep-dive rounds',
        'Rubric-based scoring with replay',
        'Company-specific question banks',
      ]}
      actions={<Button>Start mock interview</Button>}
    />
  );
}

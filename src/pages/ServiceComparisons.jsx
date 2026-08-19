import { Swords } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SERVICE_BATTLES } from '../data/saaStudyTools.js';

export default function ServiceComparisons() {
  return <div className="space-y-6"><PageHeader eyebrow="Study · Service battles" title="Choose between plausible AWS services" subtitle="The distinctions that turn two technically valid answers into one best architecture." icon={Swords} />
    <div className="grid gap-4 xl:grid-cols-2">{SERVICE_BATTLES.map(([name,when,choose,trap]) => <article key={name} className="surface rounded-2xl p-5"><h2 className="text-lg font-extrabold">{name}</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-[10px] font-extrabold uppercase tracking-widest text-success">When to choose</dt><dd className="mt-1 leading-relaxed">{when} {choose}</dd></div><div><dt className="text-[10px] font-extrabold uppercase tracking-widest text-danger">Common trap / when not to choose</dt><dd className="mt-1 text-muted leading-relaxed">{trap}</dd></div></dl></article>)}</div>
  </div>;
}

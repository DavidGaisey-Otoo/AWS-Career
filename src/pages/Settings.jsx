import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import {
  Bell, Brain, Briefcase, Camera, ClipboardCopy, Database, Download, Eye, EyeOff,
  Github, Globe2, KeyRound, Linkedin, Monitor, Moon, Palette, RotateCcw, Settings as SettingsIcon,
  Sliders, Sparkles, Sun, Trash2, Upload, User, Wand2,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { fireConfetti } from '../components/ui/Confetti.js';
import { useApp } from '../context/AppContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { AWS_LEVELS, GOALS, STORAGE_KEY } from '../lib/constants.js';
import { cn, formatCurrency } from '../lib/utils.js';

const SECTIONS = [
  { id: 'profile',       label: 'Profile',          icon: User },
  { id: 'notifications', label: 'Notifications',    icon: Bell },
  { id: 'display',       label: 'Display',          icon: Palette },
  { id: 'study',         label: 'Study preferences', icon: Brain },
  { id: 'integrations',  label: 'Integrations',     icon: Sliders },
  { id: 'data',          label: 'Data management',  icon: Database },
];

export default function Settings() {
  const [section, setSection] = useState('profile');
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Make it yours."
        subtitle="Profile, notifications, display, study prefs, integrations, data management."
        icon={SettingsIcon}
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="surface rounded-2xl p-2 h-fit lg:sticky lg:top-24">
          <ul className="space-y-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <button onClick={() => setSection(s.id)}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition focus-ring',
                            section === s.id ? 'bg-aws-orange/10 text-aws-orange' : 'text-muted hover:text-current hover:bg-[var(--card-2)]'
                          )}>
                    <Icon size={14} /> {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <motion.div key={section} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                    className="space-y-4">
          {section === 'profile'       && <ProfileSection />}
          {section === 'notifications' && <NotificationSection />}
          {section === 'display'       && <DisplaySection />}
          {section === 'study'         && <StudySection />}
          {section === 'integrations'  && <IntegrationSection />}
          {section === 'data'          && <DataSection />}
        </motion.div>
      </div>
    </div>
  );
}

// ============================ PROFILE ============================

function ProfileSection() {
  const { profile, updateProfile } = useApp();
  const toast = useToast();
  const fileRef = useRef(null);

  const onAvatar = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateProfile({ avatar: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <Section title="Profile" subtitle="Used across your dashboard, certificates, and exports.">
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <button onClick={() => fileRef.current?.click()}
                className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[var(--card-2)] border border-token grid place-items-center hover:border-aws-orange transition focus-ring group">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <Camera className="text-muted group-hover:text-aws-orange transition" size={28} />
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
               onChange={(e) => onAvatar(e.target.files?.[0])} />
        <div className="flex-1 w-full grid sm:grid-cols-2 gap-3">
          <Field label="Display name" value={profile.name} onChange={(v) => updateProfile({ name: v })} wide />
          <Field label="Bio" as="textarea" value={profile.bio || ''} onChange={(v) => updateProfile({ bio: v })} wide />
          <Field label="Country" value={profile.country || 'Ghana'} onChange={(v) => updateProfile({ country: v })} />
          <Field label="Timezone" value={profile.timezone || 'GMT'} onChange={(v) => updateProfile({ timezone: v })} />
          <Field label="Current AWS level" as="select" value={profile.level || ''}
                 onChange={(v) => updateProfile({ level: v })}
                 options={[['', 'Select…'], ...AWS_LEVELS.map((l) => [l.id, l.label])]} />
          <Field label="Main goal" as="select" value={profile.goal || ''}
                 onChange={(v) => updateProfile({ goal: v })}
                 options={[['', 'Select…'], ...GOALS.map((g) => [g.id, g.label])]} />
          <Field label="Target monthly income (USD)" type="number" value={profile.targetIncome || 0}
                 onChange={(v) => updateProfile({ targetIncome: Number(v) || 0 })} />
          <Field label="Target job-ready date" type="date" value={profile.targetDate || ''}
                 onChange={(v) => updateProfile({ targetDate: v })} />
        </div>
      </div>
      <div className="mt-3 text-[11px] text-muted">
        Current target: <strong className="text-current">{formatCurrency(profile.targetIncome || 0)}/mo</strong>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => { toast.success('Profile saved'); fireConfetti({ origin: { y: 0.3 } }); }}>Save</Button>
      </div>
    </Section>
  );
}

// ============================ NOTIFICATIONS ============================

function NotificationSection() {
  const { prefs, setNotificationPrefs } = useApp();
  const n = prefs.notifications;
  return (
    <Section title="Notifications" subtitle="Choose what we'll ping you about + when.">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Daily study reminder" type="time" value={n.dailyStudyReminderTime}
               onChange={(v) => setNotificationPrefs({ dailyStudyReminderTime: v })} />
        <Field label="Streak reminder" type="time" value={n.streakReminderTime}
               onChange={(v) => setNotificationPrefs({ streakReminderTime: v })} />
        <Field label="Exam practice reminder" as="select" value={n.examPracticeFrequency}
               onChange={(v) => setNotificationPrefs({ examPracticeFrequency: v })}
               options={[['off', 'Off'], ['weekly', 'Weekly'], ['daily', 'Daily']]} />
      </div>

      <div className="mt-5 space-y-2">
        <Toggle label="Market intelligence alerts"             checked={n.marketAlerts}
                onChange={(v) => setNotificationPrefs({ marketAlerts: v })} />
        <Toggle label="Community notifications"                 checked={n.communityNotifications}
                onChange={(v) => setNotificationPrefs({ communityNotifications: v })} />
        <Toggle label="Proposal follow-up reminders"            checked={n.proposalFollowupReminders}
                onChange={(v) => setNotificationPrefs({ proposalFollowupReminders: v })} />
        <Toggle label="AWS news alerts"                         checked={n.awsNewsAlerts}
                onChange={(v) => setNotificationPrefs({ awsNewsAlerts: v })} />
      </div>
    </Section>
  );
}

// ============================ DISPLAY ============================

const ACCENTS = ['#FF9900', '#00D4FF', '#7C3AED', '#00C853', '#FFD600', '#FF4444', '#F472B6', '#34D399'];
const FONT_SCALES = [
  { val: 0.875, label: 'Small' },
  { val: 1,     label: 'Medium' },
  { val: 1.125, label: 'Large' },
  { val: 1.25,  label: 'Extra Large' },
];
const COLORBLIND_MODES = [
  { val: 'off',         label: 'Off' },
  { val: 'protanopia',  label: 'Protanopia (red-blind)' },
  { val: 'deuteranopia',label: 'Deuteranopia (green-blind)' },
  { val: 'tritanopia',  label: 'Tritanopia (blue-blind)' },
];

function DisplaySection() {
  const { prefs, setDisplayPrefs } = useApp();
  const { theme, setTheme } = useTheme();
  const d = prefs.display;

  return (
    <>
      <Section title="Theme" subtitle="Pick a base theme. Accent + font scale apply on top.">
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'dark',   label: 'Dark',   icon: Moon },
            { id: 'light',  label: 'Light',  icon: Sun },
            { id: 'system', label: 'System', icon: Monitor },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.id;
            return (
              <button key={t.id}
                      onClick={() => setTheme(t.id === 'system'
                        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                        : t.id)}
                      className={cn('rounded-2xl p-4 text-left border transition focus-ring',
                        isActive ? 'border-aws-orange bg-aws-orange/10 shadow-glow-orange'
                                 : 'border-token hover:bg-[var(--card-2)]')}>
                <Icon size={18} className="text-aws-orange mb-2" />
                <div className="font-bold text-sm">{t.label}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Accent colour" subtitle="Used across charts + active states. Save the AWS orange unless you really love a colour.">
        <div className="flex items-center gap-2 flex-wrap">
          {ACCENTS.map((c) => (
            <button key={c} onClick={() => setDisplayPrefs({ accentColor: c })}
                    className={cn('w-9 h-9 rounded-xl border-2 transition',
                                  d.accentColor === c ? 'border-aws-orange ring-2 ring-aws-orange/30' : 'border-transparent')}
                    style={{ background: c }} title={c} aria-label={`Set accent ${c}`} />
          ))}
        </div>
      </Section>

      <Section title="Font size">
        <div className="grid grid-cols-4 gap-2">
          {FONT_SCALES.map((f) => (
            <button key={f.val} onClick={() => setDisplayPrefs({ fontScale: f.val })}
                    className={cn('rounded-xl py-2 text-xs font-bold transition border',
                                  d.fontScale === f.val
                                    ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                                    : 'border-token text-muted hover:text-current')}>
              {f.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Accessibility">
        <div className="space-y-2">
          <Toggle label="Compact mode (tighter spacing)"      checked={d.compactMode}    onChange={(v) => setDisplayPrefs({ compactMode: v })} />
          <Toggle label="Reduced motion (lower animation)"     checked={d.reducedMotion}  onChange={(v) => setDisplayPrefs({ reducedMotion: v })} />
          <Toggle label="High contrast"                        checked={d.highContrast}   onChange={(v) => setDisplayPrefs({ highContrast: v })} />
        </div>
        <div className="mt-4">
          <Field label="Colour-blind friendly mode" as="select" value={d.colorblindMode}
                 onChange={(v) => setDisplayPrefs({ colorblindMode: v })}
                 options={COLORBLIND_MODES.map((m) => [m.val, m.label])} />
        </div>
      </Section>
    </>
  );
}

// ============================ STUDY PREFS ============================

const LEARNING_STYLES = [
  { id: 'visual',    label: 'Visual',     icon: '👁' },
  { id: 'reading',   label: 'Reading',    icon: '📚' },
  { id: 'hands-on',  label: 'Hands-on',   icon: '🔧' },
  { id: 'mixed',     label: 'Mixed',      icon: '🎭' },
];
const DIFFICULTY = [
  { id: 'challenge', label: 'Challenge me' },
  { id: 'balanced',  label: 'Balanced' },
  { id: 'easy',      label: 'Ease me in' },
];

function StudySection() {
  const { prefs, setStudyPrefs } = useApp();
  const s = prefs.study;
  return (
    <Section title="Study preferences" subtitle="Powers the recommended-focus engine + Pomodoro defaults.">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Default Pomodoro duration (min)" type="number" value={s.pomodoroDefaultMin}
               onChange={(v) => setStudyPrefs({ pomodoroDefaultMin: Math.max(5, Math.min(120, Number(v) || 25)) })} />
        <Field label="Daily study goal (hours)" type="number" value={s.dailyStudyGoalHours}
               onChange={(v) => setStudyPrefs({ dailyStudyGoalHours: Math.max(0.5, Math.min(16, Number(v) || 2)) })} />
        <Field label="Preferred study time" as="select" value={s.preferredStudyTime}
               onChange={(v) => setStudyPrefs({ preferredStudyTime: v })}
               options={[['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening'], ['night', 'Night']]} />
      </div>

      <div className="mt-5">
        <div className="text-[10px] uppercase tracking-widest font-extrabold text-muted mb-2">Learning style</div>
        <div className="grid grid-cols-4 gap-2">
          {LEARNING_STYLES.map((l) => (
            <button key={l.id} onClick={() => setStudyPrefs({ learningStyle: l.id })}
                    className={cn('rounded-xl py-2.5 text-xs font-bold transition border',
                                  s.learningStyle === l.id
                                    ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                                    : 'border-token text-muted hover:text-current')}>
              <div className="text-base">{l.icon}</div>
              <div className="mt-1">{l.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[10px] uppercase tracking-widest font-extrabold text-muted mb-2">Difficulty preference</div>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTY.map((d) => (
            <button key={d.id} onClick={() => setStudyPrefs({ difficultyPreference: d.id })}
                    className={cn('rounded-xl py-2 text-xs font-bold transition border',
                                  s.difficultyPreference === d.id
                                    ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                                    : 'border-token text-muted hover:text-current')}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================ INTEGRATIONS ============================

function IntegrationSection() {
  const { profile, updateIntegrations } = useApp();
  const i = profile.integrations || {};
  const toast = useToast();
  return (
    <Section title="Integrations" subtitle="Link your external profiles so the app can reference them in proposals + portfolio.">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="GitHub URL"   icon={Github}   value={i.github}    onChange={(v) => updateIntegrations({ github: v })}
               placeholder="https://github.com/your-handle" wide />
        <Field label="LinkedIn URL" icon={Linkedin} value={i.linkedin}  onChange={(v) => updateIntegrations({ linkedin: v })}
               placeholder="https://linkedin.com/in/your-handle" wide />
        <Field label="Upwork URL"   icon={Briefcase} value={i.upwork}   onChange={(v) => updateIntegrations({ upwork: v })}
               placeholder="https://www.upwork.com/freelancers/~..." wide />
        <Field label="Hashnode URL" icon={Globe2}   value={i.hashnode}  onChange={(v) => updateIntegrations({ hashnode: v })}
               placeholder="https://your-name.hashnode.dev" wide />
      </div>

      {/* GitHub Personal Access Token — enables one-click "Push to GitHub" */}
      <GitHubTokenPanel
        currentToken={i.githubToken}
        onSave={(v) => updateIntegrations({ githubToken: v })}
      />

      <div className="mt-4 flex justify-end">
        <Button onClick={() => toast.success('Integration links saved')}>Save links</Button>
      </div>
    </Section>
  );
}

function GitHubTokenPanel({ currentToken, onSave }) {
  const toast = useToast();
  const [value, setValue] = useState(currentToken || '');
  const [show, setShow] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(null); // { ok, user, message }

  const verify = async () => {
    setVerifying(true);
    const { whoAmI } = await import('../lib/githubPush.js');
    const out = await whoAmI(value.trim());
    setVerified(out);
    setVerifying(false);
    if (out.ok) toast.success(`Verified — @${out.user.login}`);
    else        toast.error('Token check failed — see below');
  };

  const save = () => {
    onSave(value.trim());
    toast.success(value.trim() ? 'GitHub token saved' : 'GitHub token cleared');
  };

  const hasToken = !!currentToken;
  return (
    <details className="mt-4 rounded-xl border border-token bg-[var(--card-2)]/40 p-3" open={!hasToken}>
      <summary className="text-xs font-extrabold cursor-pointer flex items-center gap-2">
        <Github size={12} className="text-aws-orange" />
        GitHub push integration
        {hasToken
          ? <span className="chip border border-success/40 bg-success/10 text-success text-[9px] font-bold ml-1">● Token saved</span>
          : <span className="chip border border-token text-[9px] font-bold ml-1 text-muted">Not set</span>}
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-[11px] text-muted leading-relaxed">
          With a GitHub Personal Access Token (PAT) saved here, every completed project gets a
          one-click <strong className="text-current">"Push to GitHub"</strong> button.
          The app creates a new repo, pushes your README + architecture diagram + screenshots + Terraform skeleton,
          adds searchable topics, and stamps the URL back on your portfolio card. Zero terminal commands.
        </p>

        <div className="rounded-lg border border-aws-orange/30 bg-aws-orange/5 p-2.5 text-[11px] leading-relaxed">
          <div className="font-extrabold text-aws-orange mb-1">⚡ 60-second setup</div>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Open <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer" className="text-aws-orange font-bold hover:underline">github.com → Settings → Developer settings → Fine-grained tokens</a></li>
            <li>Click <strong>"Generate new token"</strong>. Name: "aws-launchpad-portfolio". Expiry: 90 days.</li>
            <li>Repository access: <strong>"All repositories"</strong> (or scope to a portfolio-only group).</li>
            <li>Permissions: <strong>Contents = Read+Write</strong>, <strong>Administration = Read+Write</strong>, <strong>Metadata = Read</strong>.</li>
            <li>Generate → copy the token (starts with <code className="font-mono text-aws-orange">github_pat_</code>) → paste below.</li>
          </ol>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
          <label className="block">
            <span className="text-[10px] font-bold text-muted">Personal Access Token</span>
            <div className="mt-1 flex gap-1">
              <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => { setValue(e.target.value); setVerified(null); }}
                placeholder="github_pat_…"
                className="flex-1 bg-[var(--card)] border border-token rounded-md px-2 py-1.5 text-xs font-mono focus-ring focus:border-aws-orange"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="p-2 rounded border border-token text-muted hover:text-current"
                aria-label={show ? 'Hide token' : 'Show token'}
              >{show ? '🙈' : '👁'}</button>
            </div>
          </label>
          <div className="flex gap-1">
            <button onClick={verify} disabled={!value || verifying} className="btn btn-ghost !text-xs">
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
            <button onClick={save} className="btn btn-primary !text-xs">Save</button>
          </div>
        </div>

        {verified && (
          <div className={cn(
            'rounded-lg border p-2 text-[11px]',
            verified.ok ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger',
          )}>
            {verified.ok
              ? <>✅ {verified.message} — ready to push.</>
              : <>❌ {verified.message}</>}
          </div>
        )}

        <div className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-[10px] leading-relaxed">
          <strong className="text-warning">Security note:</strong> the token lives in this browser's localStorage.
          Use a <strong>fine-grained PAT</strong> with a 90-day expiry. Rotate it regularly.
          Don't paste a token with admin/delete scopes — push-only is enough.
        </div>
      </div>
    </details>
  );
}

// ============================ DATA MANAGEMENT ============================

function DataSection() {
  const { exportAll, importAll, storageUsage, resetSection, resetAll } = useApp();
  const toast = useToast();
  const fileRef = useRef(null);

  const exportJson = () => {
    const json = exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aws-launchpad-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded');
  };

  const onImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importAll(reader.result);
        toast.success('Imported — reloading…');
      } catch (e) {
        toast.error(`Import failed: ${e.message}`);
      }
    };
    reader.readAsText(file);
  };

  const formatBytes = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  };

  const sections = [
    ['roadmap',     'Roadmap progress'],
    ['portfolio',   'Portfolio'],
    ['learning',    'Learning lab'],
    ['exam',        'Exam attempts'],
    ['freelance',   'Freelance data'],
    ['gamification','Gamification (XP, badges)'],
    ['community',   'Community'],
    ['wellness',    'Wellness'],
    ['uk',          'UK planner'],
  ];

  return (
    <>
      <Section title="Backup + restore" subtitle="JSON file you can take with you. Import wipes existing data.">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={exportJson} icon={Download}>Export everything (JSON)</Button>
          <Button variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>Import backup</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
                 onChange={(e) => onImport(e.target.files?.[0])} />
        </div>
        <div className="mt-3 text-[11px] text-muted">
          Browser storage used: <strong className="text-current">{formatBytes(storageUsage)}</strong>
          {' '}(localStorage cap is typically 5 MB per origin).
        </div>
      </Section>

      <Section title="Reset specific sections" subtitle="Wipes one subsystem and reloads the app. Cannot be undone — back up first.">
        <ul className="grid sm:grid-cols-2 gap-2">
          {sections.map(([id, label]) => (
            <li key={id}>
              <button onClick={() => {
                        if (confirm(`Reset "${label}"? This cannot be undone.`)) resetSection(id);
                      }}
                      className="w-full flex items-center justify-between rounded-xl border border-token bg-[var(--card-2)]/40 p-2.5 hover:border-danger/40 transition focus-ring text-left">
                <span className="text-xs font-bold">{label}</span>
                <Trash2 size={12} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-danger/40 bg-danger/[0.03] p-6">
        <h3 className="text-lg font-bold tracking-tight text-danger">Danger zone</h3>
        <p className="text-sm text-muted mt-1 mb-4">Wipe everything and re-run onboarding.</p>
        <Button variant="danger" icon={RotateCcw}
                onClick={() => { if (confirm('Reset ALL data and re-run onboarding?')) resetAll(); }}>
          Reset everything
        </Button>
      </motion.div>
    </>
  );
}

// ============================ shared ============================

function Section({ title, subtitle, children }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="surface rounded-2xl p-6">
      <div className="mb-5">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.section>
  );
}

function Field({ label, value, onChange, type = 'text', as, options = [], icon: Icon, placeholder, wide }) {
  return (
    <label className={cn('block', wide && 'sm:col-span-2')}>
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1.5">
        {Icon ? <Icon size={11} className="text-aws-orange" /> : null}
        {label}
      </span>
      {as === 'select' ? (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-xl px-3 py-2.5 text-sm font-semibold focus-ring focus:border-aws-orange">
          {options.map((o) => {
            const [v, l] = Array.isArray(o) ? o : [o, o];
            return <option key={v} value={v}>{l}</option>;
          })}
        </select>
      ) : as === 'textarea' ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3}
                  placeholder={placeholder}
                  className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-xl p-2.5 text-sm focus-ring focus:border-aws-orange resize-y" />
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder}
               className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-xl px-3 py-2.5 text-sm font-semibold focus-ring focus:border-aws-orange" />
      )}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
            className="flex items-center justify-between w-full rounded-xl px-3 py-3 hover:bg-[var(--card-2)] transition focus-ring">
      <span className="text-sm font-medium">{label}</span>
      <span className={cn('relative w-11 h-6 rounded-full transition-colors',
                          checked ? 'bg-aws-orange' : 'bg-[var(--card-2)] border border-token')}>
        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                            checked && 'translate-x-5')} />
      </span>
    </button>
  );
}

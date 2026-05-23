import { motion } from 'framer-motion';
import {
  ArrowUp, Bookmark, ChevronRight, Crown, Filter, Flag, Flame, Github, Heart,
  MessageSquare, MessageSquarePlus, Plus, Send, Sparkles, Star, Trophy,
  UserCheck, Users, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useCommunity } from '../context/CommunityContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { FORUM_CATEGORIES, SUCCESS_CATEGORIES } from '../data/community.js';
import { cn, formatDate } from '../lib/utils.js';

const TABS = [
  { id: 'forum',     label: 'Forum',           icon: MessageSquare },
  { id: 'buddies',   label: 'Study buddies',   icon: Users },
  { id: 'showcase',  label: 'Project showcase',icon: Star },
  { id: 'success',   label: 'Success wall',    icon: Trophy },
];

export default function Community() {
  const [tab, setTab] = useState('forum');

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Community"
        title="Build with builders."
        subtitle="A warm, supportive AWS community. Ask questions, find a study buddy, ship together, celebrate wins."
        icon={Users}
      />

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-[var(--card-2)] p-1 border border-token">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring',
                      tab === t.id
                        ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
                        : 'text-muted hover:text-current'
                    )}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {tab === 'forum'    && <Forum />}
        {tab === 'buddies'  && <StudyBuddies />}
        {tab === 'showcase' && <Showcase />}
        {tab === 'success'  && <SuccessWall />}
      </motion.div>
    </div>
  );
}

// =================================================================
// FORUM
// =================================================================

function Forum() {
  const { allPosts, addPost, repliesFor, togglePostUpvote, toggleReplyUpvote,
          state, addReply, markSolution, toggleBookmark, reportPost } = useCommunity();
  const toast = useToast();
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', body: '', category: 'general', tags: '' });
  const [replyDraft, setReplyDraft] = useState('');

  const filtered = useMemo(() => {
    return allPosts.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (query && !((p.title + ' ' + p.body + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
  }, [allPosts, category, query]);

  const active = useMemo(() => allPosts.find((p) => p.id === openId), [allPosts, openId]);

  const save = () => {
    if (!newPost.title.trim()) { toast.warning('Title required'); return; }
    addPost({
      title: newPost.title,
      body: newPost.body,
      category: newPost.category,
      tags: newPost.tags.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setNewOpen(false);
    setNewPost({ title: '', body: '', category: 'general', tags: '' });
    toast.success('Posted to the forum');
  };

  const submitReply = () => {
    if (!replyDraft.trim() || !active) return;
    addReply(active.id, replyDraft.trim());
    setReplyDraft('');
    toast.success('Reply posted');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      {/* List */}
      <div className="space-y-3">
        <div className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-aws-orange" />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1">
            <option value="all">All categories</option>
            {FORUM_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder="Search posts…"
                 className="flex-1 min-w-[120px] bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs focus-ring focus:border-aws-orange" />
          <button onClick={() => setNewOpen(true)} className="btn btn-primary !text-xs !py-1.5">
            <Plus size={12} /> New post
          </button>
        </div>

        <ul className="space-y-2">
          {filtered.length === 0 ? (
            <li className="surface rounded-2xl p-8 text-center text-sm text-muted">No posts match.</li>
          ) : filtered.map((p) => {
            const replies = repliesFor(p);
            const cat = FORUM_CATEGORIES.find((c) => c.id === p.category);
            const upvoted = !!state.upvotes[`p-${p.id}`];
            const bookmarked = !!state.bookmarks[p.id];
            return (
              <li key={p.id}>
                <button
                  onClick={() => setOpenId(p.id)}
                  className={cn(
                    'w-full text-left surface rounded-2xl p-3.5 hover:border-aws-orange/40 transition focus-ring',
                    openId === p.id && 'border-aws-orange'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); togglePostUpvote(p.id); }}
                              className={cn('p-1 rounded-md hover:bg-[var(--card-2)]', upvoted && 'text-aws-orange')}
                              title="Upvote">
                        <ArrowUp size={14} />
                      </button>
                      <span className="text-[11px] font-extrabold tabular-nums">{(p.upvotes || 0) + (upvoted ? 1 : 0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cat && <span className="chip border border-token bg-[var(--card-2)] text-[10px] font-bold">{cat.icon} {cat.label}</span>}
                        {p.author?.isMentor && (
                          <span className="chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 text-[10px] font-bold">
                            <UserCheck size={9} /> Mentor
                          </span>
                        )}
                        {p.isMine && (
                          <span className="chip bg-electric/10 text-electric border border-electric/30 text-[10px] font-bold">Mine</span>
                        )}
                      </div>
                      <h4 className="text-sm font-extrabold tracking-tight mt-1 leading-snug">{p.title}</h4>
                      <p className="text-[11px] text-muted leading-relaxed mt-1 line-clamp-2">{p.body}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted">
                        <span>{p.author?.country_flag} {p.author?.name}</span>
                        <span>·</span>
                        <span>{formatDate(p.at)}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1"><MessageSquare size={9} /> {replies.length}</span>
                        {bookmarked && <Bookmark size={10} className="text-aws-orange fill-aws-orange" />}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Detail */}
      <div className="surface rounded-2xl p-5 min-h-[400px]">
        {!active ? (
          <div className="h-full grid place-items-center text-center text-muted py-12">
            <div>
              <MessageSquare size={28} className="mx-auto mb-2 text-aws-orange" />
              <div className="text-sm font-bold">Pick a post to read</div>
              <div className="text-xs mt-1">Or create one. The community is warm — questions get answered.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2 mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-extrabold tracking-tight leading-snug">{active.title}</h3>
                <div className="text-[11px] text-muted mt-1">
                  {active.author?.country_flag} {active.author?.name} · {formatDate(active.at)}
                </div>
              </div>
              <button onClick={() => toggleBookmark(active.id)}
                      className={cn('p-1.5 rounded-md hover:bg-[var(--card-2)]', state.bookmarks[active.id] && 'text-aws-orange')}>
                <Bookmark size={14} className={state.bookmarks[active.id] ? 'fill-current' : ''} />
              </button>
              <button onClick={() => { reportPost(active.id); toast.info('Reported. Thanks.'); }}
                      className="p-1.5 rounded-md hover:bg-[var(--card-2)] text-muted hover:text-danger" title="Report">
                <Flag size={14} />
              </button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{active.body}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(active.tags || []).map((t) => (
                <span key={t} className="chip border border-token bg-[var(--card-2)] text-[10px] font-bold">{t}</span>
              ))}
            </div>

            <div className="mt-4 border-t border-token pt-4">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2 inline-flex items-center gap-1.5">
                <MessageSquare size={10} /> Replies
              </h4>
              <ul className="space-y-2">
                {repliesFor(active).length === 0 && (
                  <li className="text-xs text-muted italic">No replies yet — be first.</li>
                )}
                {repliesFor(active).map((r) => {
                  const upvoted = !!state.upvotes[`r-${r.id}`];
                  const solution = state.solutions[active.id] === r.id || r.solution;
                  return (
                    <li key={r.id} className={cn(
                      'rounded-xl border p-2.5',
                      solution ? 'border-success/40 bg-success/[0.04]' : 'border-token bg-[var(--card-2)]/30'
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-muted">{r.author?.country_flag} <strong>{r.author?.name}</strong></span>
                        {r.author?.isMentor && <span className="chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 text-[9px] font-bold"><UserCheck size={9} /> Mentor</span>}
                        {solution && <span className="chip bg-success/15 text-success border border-success/30 text-[9px] font-bold">✓ Solution</span>}
                      </div>
                      <p className="text-xs leading-relaxed">{r.body}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                        <button onClick={() => toggleReplyUpvote(r.id)}
                                className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-[var(--card-2)]', upvoted && 'text-aws-orange')}>
                          <ArrowUp size={10} /> {(r.upvotes || 0) + (upvoted ? 1 : 0)}
                        </button>
                        {!solution && (
                          <button onClick={() => markSolution(active.id, r.id)}
                                  className="text-muted hover:text-success font-bold">Mark as solution</button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 flex items-start gap-2">
                <textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder="Add a reply…" rows={2}
                  className="flex-1 bg-[var(--card-2)] border border-token rounded-lg p-2 text-xs focus-ring focus:border-aws-orange resize-none"
                />
                <button onClick={submitReply} disabled={!replyDraft.trim()}
                        className={cn('btn btn-primary !text-xs', !replyDraft.trim() && 'opacity-40 cursor-not-allowed')}>
                  <Send size={12} /> Reply
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New post modal */}
      {newOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setNewOpen(false)} />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      className="relative surface rounded-3xl w-full max-w-md p-5 gradient-border">
            <button onClick={() => setNewOpen(false)} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--card-2)]">
              <X size={16} />
            </button>
            <h3 className="text-lg font-extrabold tracking-tight mb-3">New post</h3>
            <div className="space-y-2 text-xs">
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted">Category</span>
                <select value={newPost.category} onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                        className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange">
                  {FORUM_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted">Title</span>
                <input value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                       className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted">Body</span>
                <textarea value={newPost.body} onChange={(e) => setNewPost({ ...newPost, body: e.target.value })} rows={5}
                          className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg p-2.5 text-sm focus-ring focus:border-aws-orange resize-y" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted">Tags (comma-separated)</span>
                <input value={newPost.tags} onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                       placeholder="vpc, networking, beginner"
                       className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange" />
              </label>
            </div>
            <button onClick={save} className="btn btn-primary w-full mt-4">Post</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// =================================================================
// STUDY BUDDIES
// =================================================================

function StudyBuddies() {
  const { buddies, state, setBuddy, clearBuddy, checkInToday, toggleMentor } = useCommunity();
  const { profile } = useApp();
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = !!state.daily[today];
  const myBuddy = buddies.find((b) => b.isMyBuddy);

  return (
    <div className="space-y-4">
      {/* Buddy of mine */}
      <section className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-center gap-4">
          {myBuddy ? (
            <>
              <div className="text-3xl">{myBuddy.country_flag}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">Your study buddy</div>
                <h3 className="text-lg font-extrabold tracking-tight">{myBuddy.name}</h3>
                <div className="text-xs text-muted">
                  {myBuddy.level} · {myBuddy.tz} · <span className="text-warning"><Flame className="inline -mt-0.5" size={10} /> {myBuddy.streak} day streak</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { checkInToday(); toast.success('Checked in for today'); }}
                        disabled={checkedInToday}
                        className={cn('btn !text-xs', checkedInToday ? 'btn-ghost' : 'btn-primary')}>
                  {checkedInToday ? '✓ Checked in today' : 'Daily check-in'}
                </button>
                <button onClick={() => toast.info('Quiz battle is on the roadmap')} className="btn btn-ghost !text-xs">
                  <Sparkles size={12} /> Quiz battle
                </button>
                <button onClick={() => { clearBuddy(); toast.info('Buddy removed'); }} className="btn btn-ghost !text-xs text-danger">
                  Unpair
                </button>
              </div>
            </>
          ) : (
            <>
              <Users size={32} className="text-aws-orange" />
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">No buddy yet</div>
                <h3 className="text-lg font-extrabold tracking-tight">Pair up to keep each other accountable</h3>
                <p className="text-xs text-muted">Pick someone at your level + a compatible timezone.</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Mentor toggle */}
      <section className="surface rounded-2xl p-4 flex items-center gap-3">
        <Crown size={18} className="text-aws-orange" />
        <div className="flex-1">
          <h4 className="text-sm font-extrabold">Volunteer as a mentor</h4>
          <p className="text-xs text-muted">Show up in the forum + buddy list as a mentor for newer learners.</p>
        </div>
        <button onClick={toggleMentor}
                className={cn('btn !text-xs', state.isMentor ? 'btn-primary' : 'btn-ghost')}>
          {state.isMentor ? '✓ Mentor mode on' : 'Become a mentor'}
        </button>
      </section>

      {/* Candidates */}
      <section className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">Suggested buddies</h3>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {buddies.filter((b) => !b.isMyBuddy).map((b) => (
            <li key={b.id} className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-3 flex items-center gap-3">
              <div className="text-2xl flex-shrink-0">{b.country_flag}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold flex items-center gap-1.5">
                  {b.name}
                  {b.isMentor && <UserCheck size={10} className="text-aws-orange" />}
                  {b.online && <span className="w-1.5 h-1.5 rounded-full bg-success" title="Online" />}
                </div>
                <div className="text-[10px] text-muted">
                  {b.level} · {b.tz} · 🔥 {b.streak}d
                </div>
              </div>
              <button onClick={() => { setBuddy(b.id); toast.success(`Paired with ${b.name}`); }}
                      className="btn btn-primary !text-xs !py-1.5">Pair</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// =================================================================
// PROJECT SHOWCASE
// =================================================================

function Showcase() {
  const { allShowcases, addShowcase, toggleShowcaseUpvote, state } = useCommunity();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: '', blurb: '', github: '', tags: '' });

  const featured = allShowcases.find((s) => s.featured);
  const rest = allShowcases.filter((s) => !s.featured);

  const submit = () => {
    if (!draft.title.trim()) { toast.warning('Title required'); return; }
    addShowcase({
      title: draft.title,
      blurb: draft.blurb,
      github: draft.github,
      tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setOpen(false);
    setDraft({ title: '', blurb: '', github: '', tags: '' });
    toast.success('Submitted to the showcase');
  };

  return (
    <div className="space-y-4">
      {featured && (
        <section className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
              <Sparkles size={11} /> Featured this week
            </div>
            <h3 className="text-lg font-extrabold tracking-tight">{featured.title}</h3>
            <p className="text-sm text-muted mt-1">{featured.blurb}</p>
            <div className="mt-2 text-xs text-muted">{featured.author?.country_flag} {featured.author?.name}</div>
          </div>
        </section>
      )}

      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn btn-primary !text-xs">
          <Plus size={12} /> Submit a project
        </button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((s) => {
          const upvoted = !!state.upvotes[`s-${s.id}`];
          return (
            <li key={s.id} className="surface rounded-2xl p-4 hover:border-aws-orange/40 transition">
              <div className="flex items-start gap-2 mb-2">
                <h4 className="flex-1 text-sm font-extrabold tracking-tight leading-snug">{s.title}</h4>
                {s.isMine && <span className="chip bg-electric/10 text-electric border border-electric/30 text-[10px] font-bold">Mine</span>}
              </div>
              <p className="text-[11px] text-muted leading-relaxed line-clamp-3">{s.blurb}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(s.tags || []).map((t) => (
                  <span key={t} className="chip border border-token bg-[var(--card-2)] text-[9px] font-bold">{t}</span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <span className="text-muted">{s.author?.country_flag} {s.author?.name}</span>
                <span className="text-muted ml-auto inline-flex items-center gap-1">
                  <Star size={10} /> {s.githubStars || 0}
                </span>
                <button onClick={() => toggleShowcaseUpvote(s.id)}
                        className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-[var(--card-2)]',
                                     upvoted && 'text-aws-orange')}>
                  <ArrowUp size={10} /> {(s.upvotes || 0) + (upvoted ? 1 : 0)}
                </button>
                <span className="inline-flex items-center gap-0.5 text-muted">
                  <MessageSquare size={10} /> {s.comments || 0}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      className="relative surface rounded-3xl w-full max-w-md p-5 gradient-border">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--card-2)]">
              <X size={16} />
            </button>
            <h3 className="text-lg font-extrabold tracking-tight mb-3">Submit a project</h3>
            <div className="space-y-2 text-xs">
              <In label="Title" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
              <In label="Short blurb" value={draft.blurb} onChange={(v) => setDraft({ ...draft, blurb: v })} as="textarea" />
              <In label="GitHub URL (optional)" value={draft.github} onChange={(v) => setDraft({ ...draft, github: v })} />
              <In label="Tags (comma-separated)" value={draft.tags} onChange={(v) => setDraft({ ...draft, tags: v })} />
            </div>
            <button onClick={submit} className="btn btn-primary w-full mt-4">Submit</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function In({ label, value, onChange, as }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted">{label}</span>
      {as === 'textarea' ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
                  className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg p-2.5 text-sm focus-ring focus:border-aws-orange resize-y" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)}
               className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange" />
      )}
    </label>
  );
}

// =================================================================
// SUCCESS WALL
// =================================================================

function SuccessWall() {
  const { allSuccess, addSuccess, toggleHeart, state } = useCommunity();
  const toast = useToast();
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ category: 'first-client', headline: '', body: '' });

  const filtered = allSuccess.filter((s) => category === 'all' || s.category === category);

  const submit = () => {
    if (!draft.headline.trim()) { toast.warning('Headline required'); return; }
    addSuccess(draft);
    setOpen(false);
    setDraft({ category: 'first-client', headline: '', body: '' });
    toast.success('Posted to the wall — celebrating you 🎉');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[{ id: 'all', label: 'All', icon: '✨' }, ...SUCCESS_CATEGORIES].map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)}
                  className={cn('chip border text-xs font-bold transition',
                    category === c.id
                      ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                      : 'border-token bg-[var(--card-2)] text-muted hover:text-current')}>
            {c.icon} {c.label}
          </button>
        ))}
        <div className="ml-auto">
          <button onClick={() => setOpen(true)} className="btn btn-primary !text-xs">
            <Plus size={12} /> Share a win
          </button>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((s) => {
          const cat = SUCCESS_CATEGORIES.find((c) => c.id === s.category);
          const hearted = !!state.hearts[`h-${s.id}`];
          return (
            <li key={s.id} className="surface rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{cat?.icon}</span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">{cat?.label}</span>
                {s.isMine && <span className="chip bg-electric/10 text-electric border border-electric/30 text-[10px] font-bold ml-1">Mine</span>}
              </div>
              <h4 className="text-sm font-extrabold tracking-tight leading-snug">{s.headline}</h4>
              <p className="text-xs leading-relaxed text-muted mt-1.5">{s.body}</p>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-muted">{s.author?.country_flag} {s.author?.name} · {formatDate(s.at)}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleHeart(s.id)}
                          className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--card-2)] transition',
                                       hearted && 'text-danger')}>
                    <Heart size={11} className={hearted ? 'fill-current' : ''} />
                    {(s.hearts || 0) + (hearted ? 1 : 0)}
                  </button>
                  <span className="text-muted inline-flex items-center gap-0.5">
                    <MessageSquare size={10} /> {s.comments || 0}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      className="relative surface rounded-3xl w-full max-w-md p-5 gradient-border">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--card-2)]">
              <X size={16} />
            </button>
            <h3 className="text-lg font-extrabold tracking-tight mb-3">Share a win</h3>
            <div className="space-y-2 text-xs">
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted">Category</span>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                        className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange">
                  {SUCCESS_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </label>
              <In label="Headline" value={draft.headline} onChange={(v) => setDraft({ ...draft, headline: v })} />
              <In label="Story" value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} as="textarea" />
            </div>
            <button onClick={submit} className="btn btn-primary w-full mt-4">Post</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

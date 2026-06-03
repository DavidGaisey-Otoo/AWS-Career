/**
 * ServiceSuggestionChips.jsx — AD-02 service detection UI.
 *
 * Layout:
 *   Detected chips (clickable)           [Lambda ✓] [API Gateway ✓] [DynamoDB ✓]
 *   Suggested companions                 [+ IAM] [+ CloudWatch]
 *   "+ Add service" picker → searchable list of all 30 services
 *
 * Click a chip → popover with:
 *   - What this service does (2 sentences)
 *   - Why it's needed for THIS specific project (matched reasons)
 *   - Free Tier headline
 *
 * Selected set is controlled by parent (controlled component) — emits
 * onChange(selectedIds[]) so the data flows into walkthrough generator,
 * cost estimator, and script generator.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, X, Info, Search, ChevronDown } from 'lucide-react';
import {
  AWS_SERVICE_CATALOG, listAllServices, getService, getServicesByCategory,
} from '../../data/awsServiceCatalog.js';
import { suggestServices } from '../../lib/serviceSuggester.js';
import { cn } from '../../lib/utils.js';

/**
 * @param {object} props
 *   - brief         text to auto-detect from (optional)
 *   - selected      string[] of currently-selected service ids
 *   - onChange      callback(string[]) when set changes
 *   - showCompanions bool — show companion suggestions row (default true)
 *   - compact       bool — render more tightly
 */
export function ServiceSuggestionChips({
  brief = '',
  selected = [],
  onChange,
  showCompanions = true,
  compact = false,
}) {
  const [openId, setOpenId] = useState(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);

  // Run the suggester on every brief change
  const suggestion = useMemo(() => suggestServices(brief), [brief]);

  // First-time auto-fill: if selected is empty and we have detections, suggest them
  const didInitAutoFill = useRef(false);
  useEffect(() => {
    if (didInitAutoFill.current) return;
    if (selected.length === 0 && suggestion.primary.length > 0 && onChange) {
      onChange(suggestion.primary.map((p) => p.service.id));
      didInitAutoFill.current = true;
    }
  }, [suggestion.primary, selected.length, onChange]);

  function toggleService(id) {
    if (!onChange) return;
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function isMatched(id) {
    return suggestion.reasonsByService[id]?.length > 0;
  }

  // Reasons array for a given service id (matched reasons if any, else generic)
  function reasonsFor(id) {
    return suggestion.reasonsByService[id] || [];
  }

  // Order chips: matched first, then any manually-added that aren't matched
  const displaySelectedIds = useMemo(() => {
    const set = new Set(selected);
    const matchedFirst = suggestion.primary
      .map((p) => p.service.id)
      .filter((id) => set.has(id));
    const otherSelected = selected.filter((id) => !suggestion.primary.find((p) => p.service.id === id));
    return [...matchedFirst, ...otherSelected];
  }, [selected, suggestion.primary]);

  // Companions to show (not already selected)
  const companionChips = useMemo(() => {
    if (!showCompanions) return [];
    return suggestion.companions.filter((c) => !selected.includes(c.service.id));
  }, [suggestion.companions, selected, showCompanions]);

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1.5">
            <Info size={11} /> Suggested AWS services
            {suggestion.primary.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-success/15 text-success text-[9px]">
                {suggestion.primary.length} detected from brief
              </span>
            )}
          </div>
          {!compact && (
            <p className="text-[11.5px] opacity-70 mt-0.5">
              Click any chip for what / why / free tier. Toggle to add or remove from your project.
            </p>
          )}
        </div>
        <button
          onClick={() => setAddPickerOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-token hover:border-aws-orange/50 hover:text-aws-orange transition"
        >
          <Plus size={11} /> Add service
        </button>
      </div>

      {/* SELECTED chips */}
      {displaySelectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {displaySelectedIds.map((id) => (
            <ServiceChip
              key={id}
              service={getService(id)}
              selected
              matched={isMatched(id)}
              reasons={reasonsFor(id)}
              open={openId === id}
              onToggleOpen={() => setOpenId(openId === id ? null : id)}
              onCloseOpen={() => setOpenId(null)}
              onRemove={() => toggleService(id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-[12px] opacity-60 italic">
          No services selected yet. {brief.length > 20 ? 'Nothing detected from the brief above — add some manually.' : 'Paste a project description above or click "Add service".'}
        </div>
      )}

      {/* COMPANION suggestions */}
      {companionChips.length > 0 && (
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-70 mb-1.5">
            Also commonly paired
          </div>
          <div className="flex flex-wrap gap-1.5">
            {companionChips.map(({ service, reasons }) => (
              <ServiceChip
                key={service.id}
                service={service}
                selected={false}
                matched={false}
                reasons={reasons}
                open={openId === service.id}
                onToggleOpen={() => setOpenId(openId === service.id ? null : service.id)}
                onCloseOpen={() => setOpenId(null)}
                onAdd={() => toggleService(service.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ADD SERVICE picker */}
      {addPickerOpen && (
        <AddServicePicker
          selectedIds={selected}
          onAdd={(id) => { toggleService(id); }}
          onClose={() => setAddPickerOpen(false)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Single chip
// ════════════════════════════════════════════════════════════════════
function ServiceChip({
  service, selected, matched, reasons,
  open, onToggleOpen, onCloseOpen, onRemove, onAdd,
}) {
  if (!service) return null;
  const cls = selected
    ? matched
      ? 'border-success bg-success/15 text-success'
      : 'border-aws-orange bg-aws-orange/15 text-aws-orange'
    : 'border-token bg-[var(--card-2)]/30 text-muted hover:border-aws-orange/40';

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={onToggleOpen}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border-2 pl-2 pr-2.5 py-1 text-[11.5px] font-bold transition',
          cls
        )}
        title="Click for what this is + why suggested + free tier"
      >
        <span className="text-[14px]">{service.icon}</span>
        <span>{service.label}</span>
        {selected && matched && <Check size={11} />}
        {selected && !matched && <span className="text-[9px] opacity-70">manual</span>}
        {!selected && <Plus size={11} />}
      </button>

      {/* Popover */}
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={onCloseOpen} />
          <div
            className="absolute z-[70] mt-2 w-[min(360px,calc(100vw-2rem))] surface rounded-2xl border-2 border-aws-orange/40 p-4 shadow-2xl space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-2">
              <div className="text-2xl">{service.icon}</div>
              <div className="flex-1">
                <h4 className="text-base font-extrabold leading-snug">{service.label}</h4>
                <div className="text-[10px] opacity-70 font-bold uppercase tracking-wide">{service.category}</div>
              </div>
              {selected ? (
                <button onClick={onRemove}
                  className="text-[10px] font-bold text-danger hover:bg-danger/10 px-1.5 py-0.5 rounded">
                  Remove ×
                </button>
              ) : (
                <button onClick={onAdd}
                  className="text-[10px] font-bold text-success hover:bg-success/10 px-1.5 py-0.5 rounded">
                  + Add
                </button>
              )}
            </div>

            {/* What */}
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
                What it is
              </div>
              <p className="text-[12.5px] opacity-90 leading-snug">{service.what}</p>
            </div>

            {/* Why (for this project) */}
            {reasons?.length > 0 && (
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
                  Why for this project
                </div>
                <ul className="space-y-1">
                  {reasons.map((r, i) => (
                    <li key={i} className="text-[12px] opacity-90 leading-snug flex items-start gap-1.5">
                      <span className="text-aws-orange flex-shrink-0">▸</span><span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Free tier */}
            <div className="rounded-lg bg-[var(--card-2)]/60 px-2.5 py-1.5">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-success mb-0.5">
                Free Tier
              </div>
              <div className="text-[11.5px] font-semibold">{service.freeTier}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Add service picker
// ════════════════════════════════════════════════════════════════════
function AddServicePicker({ selectedIds, onAdd, onClose }) {
  const [search, setSearch] = useState('');
  const grouped = useMemo(() => getServicesByCategory(), []);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const out = {};
    for (const [cat, items] of Object.entries(grouped)) {
      const match = items.filter((s) =>
        s.id.includes(q) ||
        s.label.toLowerCase().includes(q) ||
        s.what.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
      if (match.length) out[cat] = match;
    }
    return out;
  }, [grouped, search]);

  return (
    <div className="surface rounded-2xl border-2 border-aws-orange/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
          Add a service manually
        </div>
        <button onClick={onClose} className="text-muted hover:text-current">
          <X size={14} />
        </button>
      </div>
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
        <input
          type="text"
          autoFocus
          placeholder="Search by name, category, or what it does…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-[var(--card-2)] border border-token pl-8 pr-3 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
        />
      </div>
      <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1">
        {Object.entries(filtered).map(([cat, items]) => (
          <div key={cat}>
            <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-60 mb-1">
              {cat}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((svc) => {
                const isSel = selectedIds.includes(svc.id);
                return (
                  <button
                    key={svc.id}
                    onClick={() => { onAdd(svc.id); }}
                    disabled={isSel}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold transition',
                      isSel
                        ? 'border-success bg-success/15 text-success cursor-default'
                        : 'border-token hover:border-aws-orange/50 hover:text-aws-orange'
                    )}
                    title={svc.what}
                  >
                    <span>{svc.icon}</span>
                    <span>{svc.label}</span>
                    {isSel && <Check size={10} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(filtered).length === 0 && (
          <div className="text-[12px] opacity-60 italic text-center py-4">
            No services match "{search}".
          </div>
        )}
      </div>
    </div>
  );
}

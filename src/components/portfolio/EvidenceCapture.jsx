import { Camera, CheckCircle2, ShieldAlert, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { safeEvidenceFilename } from '../../lib/projectStandards.js';

export function EvidenceCapture({ project, projectState, onAdd, onCancel }) {
  const uploadRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [source, setSource] = useState('upload');
  const [title, setTitle] = useState('');
  const [testId, setTestId] = useState('');
  const [description, setDescription] = useState('');
  const [redactionReviewed, setRedactionReviewed] = useState(false);
  const [safe, setSafe] = useState(false);
  const [error, setError] = useState('');

  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const chooseFile = async (file) => {
    if (!file) return;
    setPreview(await readFile(file));
    setSource('upload');
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const captureScreen = async () => {
    setError('');
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen capture is unavailable in this browser. Upload a screenshot instead.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      setPreview(canvas.toDataURL('image/png'));
      setSource('screen-capture');
      if (!title) setTitle('Captured evidence');
    } catch (err) {
      if (err?.name !== 'NotAllowedError') setError('Capture failed. No image was saved.');
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  };

  const save = async () => {
    if (!preview || !title.trim() || !redactionReviewed || !safe) return;
    const filename = safeEvidenceFilename({
      owner: projectState.projectOwner,
      project: project.title,
      step: testId || title,
    });
    const blob = await (await fetch(preview)).blob();
    const file = new File([blob], filename, { type: 'image/png' });
    await onAdd(file, {
      title, acceptanceTestId: testId, description, source,
      environment: projectState.projectMode === 'training' ? 'simulated' : 'real-aws',
      projectOwner: projectState.projectOwner,
      redactionReviewed: true,
      sensitiveDataConfirmedAbsent: true,
      status: 'reviewed',
    });
  };

  return (
    <div className="rounded-2xl border border-info/40 bg-info/5 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div><div className="font-extrabold">Controlled evidence capture</div><p className="text-xs text-muted mt-1">Choose exactly what to share. Nothing is captured or saved silently.</p></div>
        <button onClick={onCancel} aria-label="Close evidence capture" className="btn btn-ghost !p-2"><X size={14} /></button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={captureScreen} className="btn btn-primary !text-xs"><Camera size={14} /> Capture tab, window, or screen</button>
        <button onClick={() => uploadRef.current?.click()} className="btn btn-ghost !text-xs"><Upload size={14} /> Upload image</button>
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => chooseFile(e.target.files?.[0])} />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {preview && <img src={preview} alt="Evidence preview" className="max-h-80 rounded-xl border border-token object-contain bg-black/20" />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">Evidence title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 input w-full" placeholder="Firewall rule validated" /></label>
        <label className="text-xs font-bold">Acceptance test ID<input value={testId} onChange={(e) => setTestId(e.target.value)} className="mt-1 input w-full" placeholder="TEST-SEC-01" /></label>
      </div>
      <label className="text-xs font-bold block">What this proves<textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 input w-full min-h-20" /></label>
      <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs space-y-2">
        <div className="font-extrabold flex gap-2"><ShieldAlert size={15} /> Review before saving</div>
        <label className="flex gap-2"><input type="checkbox" checked={redactionReviewed} onChange={(e) => setRedactionReviewed(e.target.checked)} /> I reviewed and redacted account IDs, emails, billing details, credentials, tokens, and unrelated windows.</label>
        <label className="flex gap-2"><input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} /> I confirm no password, key, token, or sensitive client data is visible.</label>
      </div>
      <button disabled={!preview || !title.trim() || !redactionReviewed || !safe} onClick={save} className="btn btn-primary !text-xs disabled:opacity-40"><CheckCircle2 size={14} /> Review and attach evidence</button>
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createListing, fileToSmallDataUrl, scanFood } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { ALLERGENS, CATEGORIES, UNITS, USES, categoryById, computeExpiry, maxLimitMinutes } from '../config/rules.js';
import { Countdown } from '../components/Countdown.jsx';
import { ErrorNote } from '../components/Feedback.jsx';
import { formatDateTime, toLocalInput } from '../lib/format.js';

const blank = () => ({
  title: '', description: '', categoryId: '', quantity: '', unit: 'portions', readyAt: toLocalInput(Date.now()), dateLabel: '',
  limitMinutes: '', intendedUse: 'human', allergens: [], storageNote: '', allergensConfirmed: false, safetyConfirmed: false,
});

function AiTag({ show }) {
  return show ? <span className="ai-tag">AI suggestion</span> : null;
}

export default function NewListing() {
  const { session, bump } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [f, setF] = useState(blank);
  const [photo, setPhoto] = useState(null);
  const [scan, setScan] = useState({ state: 'idle', ai: {}, suggested: [], message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const cat = categoryById(f.categoryId);
  const max = maxLimitMinutes(f.categoryId);

  const readyMs = f.readyAt ? new Date(f.readyAt).getTime() : null;
  const expiresAt = useMemo(
    () => computeExpiry({ categoryId: f.categoryId, readyAt: readyMs, dateLabel: f.dateLabel, limitMinutes: Number(f.limitMinutes) || 0 }),
    [f.categoryId, readyMs, f.dateLabel, f.limitMinutes]
  );

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setScan({ state: 'scanning', ai: {}, suggested: [], message: '' });
    try {
      setPhoto(await fileToSmallDataUrl(file));
      const r = await scanFood(file);
      const lowConfidence = r.confidence < 0.6 || !r.categoryId;
      setF((p) => ({
        ...p,
        title: p.title || r.title,
        categoryId: lowConfidence ? p.categoryId : r.categoryId,
        quantity: p.quantity || String(r.quantity),
        unit: lowConfidence ? p.unit : r.unit,
      }));
      setScan({
        state: 'done',
        ai: lowConfidence ? {} : { title: !!r.title, category: true, quantity: true },
        suggested: r.allergenSuggestions,
        message: lowConfidence
          ? 'We couldn’t tell what this is. Choose the category and fill in the details yourself.'
          : 'Check each suggestion below. Add when the food was ready and confirm allergens yourself.',
      });
    } catch (err) {
      setScan({ state: 'idle', ai: {}, suggested: [], message: '' });
      setError(err);
    }
  };

  const toggleAllergen = (a) => set('allergens', f.allergens.includes(a) ? f.allergens.filter((x) => x !== a) : [...f.allergens, a]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const l = await createListing(
        { ...f, quantity: Number(f.quantity), readyAt: readyMs, limitMinutes: Number(f.limitMinutes) || 0, photo },
        session.id
      );
      bump();
      navigate(`/listings/${l.id}`);
    } catch (err) {
      setError(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>List surplus food</h1>
      <ErrorNote error={error} />
      <form onSubmit={submit} className="form">
        <section className="scan">
          <div className="scan-photo">
            {photo ? <img src={photo} alt="Food to list" /> : <span className="muted">No photo yet</span>}
          </div>
          <div>
            <h2>Scan food with AI</h2>
            <p className="muted">Take a photo and we’ll draft the listing. The AI only suggests. You confirm everything, and the timer comes from the category.</p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} hidden />
            <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()} disabled={scan.state === 'scanning'}>
              {scan.state === 'scanning' ? 'Scanning…' : photo ? 'Scan another photo' : 'Take photo'}
            </button>
            {scan.message && <p className="note" role="status">{scan.message}</p>}
          </div>
        </section>

        <label className="field">Title <AiTag show={scan.ai.title} />
          <input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Chicken fried rice" required />
        </label>

        <label className="field">Category <AiTag show={scan.ai.category} />
          <select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)} required>
            <option value="">Choose a category</option>
            {CATEGORIES.filter((c) => c.enabled).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>

        <div className="row2">
          <label className="field">Quantity <AiTag show={scan.ai.quantity} />
            <input type="number" min="0" step="any" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} required />
          </label>
          <label className="field">Unit
            <select value={f.unit} onChange={(e) => set('unit', e.target.value)}>
              {UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </label>
        </div>

        <label className="field">Ready at
          <input type="datetime-local" value={f.readyAt} onChange={(e) => set('readyAt', e.target.value)} required />
        </label>

        {cat?.dated && (
          <label className="field">Printed date on the pack
            <input type="date" value={f.dateLabel} onChange={(e) => set('dateLabel', e.target.value)} required />
          </label>
        )}

        {max && (
          <label className="field">Shorten the time limit (minutes, optional)
            <input type="number" min="10" max={max} value={f.limitMinutes} onChange={(e) => set('limitMinutes', e.target.value)} placeholder={`Up to ${max}`} />
          </label>
        )}

        <div className={`expiry-preview${expiresAt ? '' : ' empty-preview'}`} aria-live="polite">
          <span className="stub-label">Expiry preview</span>
          {expiresAt ? (
            <>
              <Countdown expiresAt={expiresAt} big />
              <p className="muted">Closes {formatDateTime(expiresAt)}. The server confirms this when you publish.</p>
            </>
          ) : (
            <p className="muted">Choose a category and ready time to see how long this listing stays open.</p>
          )}
        </div>

        <fieldset className="field">
          <legend>Suitable for</legend>
          <div className="chips">
            {USES.map((u) => (
              <label key={u.id} className={`chip${f.intendedUse === u.id ? ' on' : ''}`}>
                <input type="radio" name="use" checked={f.intendedUse === u.id} onChange={() => set('intendedUse', u.id)} />
                {u.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Allergens</legend>
          <div className="chips">
            {ALLERGENS.map((a) => (
              <label key={a} className={`chip${f.allergens.includes(a) ? ' on' : ''}`}>
                <input type="checkbox" checked={f.allergens.includes(a)} onChange={() => toggleAllergen(a)} />
                {a}
                {scan.suggested.includes(a) && !f.allergens.includes(a) && <em className="suggest">suggested</em>}
              </label>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={f.allergensConfirmed} onChange={(e) => set('allergensConfirmed', e.target.checked)} />
            I’ve checked the ingredients and the allergen list is correct
          </label>
        </fieldset>

        <label className="field">Storage and handling notes
          <input value={f.storageNote} onChange={(e) => set('storageNote', e.target.value)} placeholder={cat?.note || 'Kept hot, boxed, chilled…'} />
        </label>
        <label className="field">Description (optional)
          <textarea rows="3" value={f.description} onChange={(e) => set('description', e.target.value)} />
        </label>

        <label className="check">
          <input type="checkbox" checked={f.safetyConfirmed} onChange={(e) => set('safetyConfirmed', e.target.checked)} />
          This food has been stored safely and is fit to eat
        </label>

        <button className="btn" disabled={busy}>{busy ? 'Publishing…' : 'Publish listing'}</button>
      </form>
    </>
  );
}

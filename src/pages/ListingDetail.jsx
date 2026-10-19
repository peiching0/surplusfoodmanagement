import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelClaim, claimListing, collectClaim, getListing, withdrawListing } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useQuery } from '../hooks/useQuery.js';
import { canReceive, categoryById, UNITS, USES } from '../config/rules.js';
import { Countdown, TimeBar } from '../components/Countdown.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { ErrorNote, Loading } from '../components/Feedback.jsx';
import { formatDateTime, num } from '../lib/format.js';

export default function ListingDetail() {
  const { id } = useParams();
  const { session, bump } = useApp();
  const { data, error, loading } = useQuery(() => getListing(id, session.id), [id, session.id]);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorNote error={error} />;

  const { listing: l, claims } = data;
  const cat = categoryById(l.categoryId);
  const unit = UNITS.find((u) => u.id === l.unit)?.label || l.unit;
  const isOwner = session.role === 'donor' && l.donorId === session.id;
  const myOpen = claims.find((c) => c.recipientId === session.id && c.status === 'confirmed');
  const fits = session.role === 'recipient' && canReceive(session.accepts, l.intendedUse);

  const run = async (fn) => {
    setBusy(true); setProblem(null);
    try { await fn(); bump(); } catch (e) { setProblem(e); } finally { setBusy(false); }
  };

  return (
    <>
      <Link to={isOwner ? '/my-listings' : '/browse'} className="back">Back</Link>
      <div className="detail-head">
        <div className="detail-photo" style={{ background: cat?.color }}>
          {l.photo ? <img src={l.photo} alt={l.title} /> : <span>{cat?.short}</span>}
        </div>
        <div>
          <StatusPill status={l.status} />
          <h1>{l.title}</h1>
          <p className="muted">
            <Link to={`/orgs/${l.donor.id}`}>{l.donor.name}</Link> · {l.donor.area}
          </p>
        </div>
      </div>

      {(l.status === 'available' || l.status === 'reserved') && (
        <div className="clock-panel">
          <span className="stub-label">Time left to collect</span>
          <Countdown expiresAt={l.expiresAt} big />
          <TimeBar readyAt={l.readyAt} expiresAt={l.expiresAt} />
          <p className="muted">Closes {formatDateTime(l.expiresAt)}. The timer is set by the server from the food category.</p>
        </div>
      )}

      {l.description && <p>{l.description}</p>}
      <dl className="facts">
        <div><dt>Quantity left</dt><dd>{num(l.quantityAvailable, 1)} of {num(l.quantityTotal, 1)} {unit}</dd></div>
        <div><dt>Category</dt><dd>{cat?.label}</dd></div>
        <div><dt>Suitable for</dt><dd>{USES.find((u) => u.id === l.intendedUse)?.label}</dd></div>
        <div><dt>Allergens</dt><dd>{l.allergens.length ? l.allergens.join(', ') : 'None declared'}</dd></div>
        {(l.storageNote || cat?.note) && <div><dt>Storage</dt><dd>{l.storageNote || cat.note}</dd></div>}
        <div><dt>Ready at</dt><dd>{formatDateTime(l.readyAt)}</dd></div>
        <div><dt>Pickup</dt><dd>Self pickup at {l.donor.address}. {l.donor.hours}.</dd></div>
      </dl>

      <ErrorNote error={problem} />

      {session.role === 'recipient' && myOpen && (
        <section className="claim-panel">
          <h2>Your pickup code</h2>
          <p className="code" aria-label={`Pickup code ${myOpen.code.split('').join(' ')}`}>{myOpen.code}</p>
          <p>Show this to {l.donor.name} when you collect {num(myOpen.quantity, 1)} {unit}.</p>
          <p className="muted">Collect within <Countdown expiresAt={myOpen.deadline} /> or the claim is released.</p>
          <button className="btn ghost" disabled={busy} onClick={() => run(() => cancelClaim(myOpen.id, session.id))}>Cancel claim</button>
        </section>
      )}

      {session.role === 'recipient' && l.status === 'available' && !myOpen && (
        <section className="claim-panel">
          <h2>Claim this food</h2>
          {fits ? (
            <>
              <label className="field">Quantity ({unit})
                <input type="number" min="1" max={l.quantityAvailable} step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
              </label>
              <button className="btn" disabled={busy} onClick={() => run(() => claimListing(l.id, session.id, qty))}>
                {busy ? 'Claiming…' : 'Claim food'}
              </button>
              <p className="muted">Self pickup only. You’ll get a code to show at handover.</p>
            </>
          ) : (
            <p className="muted">This food isn’t suitable for what your organization accepts.</p>
          )}
        </section>
      )}

      {isOwner && (
        <section className="claim-panel">
          <h2>Claims</h2>
          {claims.length === 0 && <p className="muted">No claims yet. Recipients nearby have been notified.</p>}
          {claims.map((c) => (
            <div key={c.id} className="claim-row">
              <div>
                <strong>{c.recipient.name}</strong>
                <p className="muted">{num(c.quantity, 1)} {unit} · claimed {formatDateTime(c.claimedAt)}</p>
              </div>
              <StatusPill status={c.status} />
            </div>
          ))}
          {claims.some((c) => c.status === 'confirmed') && (
            <div className="handover">
              <label className="field">Confirm handover with pickup code
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter 6-character code" maxLength={6} />
              </label>
              <button className="btn" disabled={busy || code.length < 6} onClick={() => run(async () => { await collectClaim(code, session.id); setCode(''); })}>Confirm handover</button>
            </div>
          )}
          {(l.status === 'available' || l.status === 'reserved') && (
            <button className="btn ghost danger" disabled={busy} onClick={() => run(() => withdrawListing(l.id, session.id))}>Withdraw listing</button>
          )}
        </section>
      )}
    </>
  );
}

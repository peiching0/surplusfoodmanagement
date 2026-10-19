import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listClaims } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useQuery } from '../hooks/useQuery.js';
import { UNITS } from '../config/rules.js';
import StatusPill from '../components/StatusPill.jsx';
import { Empty, ErrorNote, Loading } from '../components/Feedback.jsx';
import { formatDateTime, num } from '../lib/format.js';

export default function PastClaims() {
  const { session } = useApp();
  const donor = session.role === 'donor';
  const [status, setStatus] = useState('');
  const { data, loading, error } = useQuery(() => listClaims(session.id, session.role), [session.id]);
  const rows = (data || []).filter((c) => !status || c.status === status);

  return (
    <>
      <h1>{donor ? 'Past donations' : 'Past claims'}</h1>
      <div className="filters">
        <label>Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="collected">Collected</option>
            <option value="confirmed">Ready for pickup</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
            <option value="expired">Expired</option>
          </select>
        </label>
      </div>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : rows.length ? (
        <ul className="rows">
          {rows.map((c) => {
            const unit = UNITS.find((u) => u.id === c.listing.unit)?.label || c.listing.unit;
            const other = donor ? c.recipient : c.donor;
            return (
              <li key={c.id} className="row-item">
                <div>
                  <Link to={`/listings/${c.listingId}`}><strong>{c.listing.title}</strong></Link>
                  <p className="muted">{donor ? 'Claimed by' : 'From'} {other.name} · {num(c.quantity, 1)} {unit}</p>
                </div>
                <div className="row-side">
                  <StatusPill status={c.status} />
                  <span className="muted">
                    {c.collectedAt ? `Collected ${formatDateTime(c.collectedAt)}` : `Claimed ${formatDateTime(c.claimedAt)}`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty title={donor ? 'No donations yet' : 'No claims yet'} action={!donor && <Link className="btn" to="/browse">Browse food</Link>}>
          {donor ? 'Claims on your listings will appear here.' : 'Claim surplus food and your history will show up here.'}
        </Empty>
      )}
    </>
  );
}

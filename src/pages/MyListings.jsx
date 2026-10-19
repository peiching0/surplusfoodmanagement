import { useState } from 'react';
import { Link } from 'react-router-dom';
import { collectClaim, listListings } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useQuery } from '../hooks/useQuery.js';
import ListingCard from '../components/ListingCard.jsx';
import { Empty, ErrorNote, Loading } from '../components/Feedback.jsx';

export default function MyListings() {
  const { session, bump } = useApp();
  const [tab, setTab] = useState('live');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const { data, loading, error } = useQuery(() => listListings({ donorId: session.id, scope: tab }), [tab, session.id]);

  const handover = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const c = await collectClaim(code, session.id);
      setMsg(`Handover confirmed for ${c.recipient.name}.`);
      setCode('');
      bump();
    } catch (x) { setErr(x); }
  };

  return (
    <>
      <div className="page-head">
        <h1>My listings</h1>
        <Link className="btn" to="/new">New listing</Link>
      </div>

      <form className="handover-bar" onSubmit={handover}>
        <label className="field">Confirm handover
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Pickup code" maxLength={6} />
        </label>
        <button className="btn ghost" disabled={code.length < 6}>Confirm</button>
      </form>
      {msg && <p className="note note-good" role="status">{msg}</p>}
      <ErrorNote error={err} />

      <div className="segmented">
        <button className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>Active</button>
        <button className={tab === 'past' ? 'on' : ''} onClick={() => setTab('past')}>Past</button>
      </div>
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : data?.length ? (
        <div className="stack">{data.map((l) => <ListingCard key={l.id} listing={l} showStatus />)}</div>
      ) : tab === 'live' ? (
        <Empty title="List your first surplus" action={<Link className="btn" to="/new">List surplus food</Link>}>
          Add what’s left over and nearby charities can claim it before it expires.
        </Empty>
      ) : (
        <Empty title="No past listings yet">Completed and expired listings show up here.</Empty>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listListings, listOrgs } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useQuery } from '../hooks/useQuery.js';
import { CATEGORIES, ORG_TYPES } from '../config/rules.js';
import ListingCard from '../components/ListingCard.jsx';
import { Empty, ErrorNote, Loading } from '../components/Feedback.jsx';

export default function Browse() {
  const { session } = useApp();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const tab = params.get('tab') || 'food';
  const [input, setInput] = useState(q);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('soonest');
  const [mineOnly, setMineOnly] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => {
        const n = new URLSearchParams(p);
        if (input) n.set('q', input); else n.delete('q');
        return n;
      }, { replace: true });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const setTab = (t) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', t); return n; }, { replace: true });

  const foods = useQuery(
    () => (tab === 'food' ? listListings({ query: q, categoryId: category, sort, receiverAccepts: mineOnly ? session.accepts : '' }) : Promise.resolve([])),
    [tab, q, category, sort, mineOnly]
  );
  const orgs = useQuery(() => (tab === 'orgs' ? listOrgs({ query: q, role: 'donor' }) : Promise.resolve([])), [tab, q]);

  return (
    <>
      <h1>Find surplus food</h1>
      <div className="searchbar">
        <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search food or organizations" aria-label="Search" />
      </div>
      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={tab === 'food'} className={tab === 'food' ? 'on' : ''} onClick={() => setTab('food')}>Food</button>
        <button role="tab" aria-selected={tab === 'orgs'} className={tab === 'orgs' ? 'on' : ''} onClick={() => setTab('orgs')}>Organizations</button>
      </div>

      {tab === 'food' && (
        <>
          <div className="filters">
            <label>Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.filter((c) => c.enabled).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label>Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="soonest">Soonest to expire</option>
                <option value="nearest">Nearest</option>
                <option value="newest">Newest</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
              Only food we can receive
            </label>
          </div>
          <ErrorNote error={foods.error} />
          {foods.loading && !foods.data ? <Loading /> : foods.data?.length ? (
            <div className="stack">{foods.data.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
          ) : (
            <Empty title="Nothing matches right now">New surplus is listed throughout the day. Try clearing a filter or check back soon.</Empty>
          )}
        </>
      )}

      {tab === 'orgs' && (
        <>
          <ErrorNote error={orgs.error} />
          {orgs.loading && !orgs.data ? <Loading /> : orgs.data?.length ? (
            <div className="stack">
              {orgs.data.map((o) => (
                <Link key={o.id} to={`/orgs/${o.id}`} className="org-card">
                  <div>
                    <h3>{o.name}</h3>
                    <p className="muted">{ORG_TYPES[o.type].label} · {o.area} · {o.distanceKm} km</p>
                  </div>
                  <span className="tag">{o.activeCount} available</span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="No organizations found">Try a different name or area.</Empty>
          )}
        </>
      )}
    </>
  );
}

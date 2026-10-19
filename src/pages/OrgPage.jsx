import { useParams, Link } from 'react-router-dom';
import { getOrg } from '../api/client.js';
import { useQuery } from '../hooks/useQuery.js';
import { ORG_TYPES } from '../config/rules.js';
import ListingCard from '../components/ListingCard.jsx';
import { Empty, ErrorNote, Loading } from '../components/Feedback.jsx';

export default function OrgPage() {
  const { id } = useParams();
  const { data, error, loading } = useQuery(() => getOrg(id), [id]);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorNote error={error} />;
  const { org, listings } = data;
  return (
    <>
      <Link to="/browse?tab=orgs" className="back">Back to search</Link>
      <h1>{org.name}</h1>
      <p className="muted">{ORG_TYPES[org.type].label} · {org.area}</p>
      <dl className="facts">
        <div><dt>Address</dt><dd>{org.address}</dd></div>
        <div><dt>Handover</dt><dd>{org.hours}</dd></div>
        <div><dt>About</dt><dd>{org.about}</dd></div>
      </dl>
      <h2>Available now</h2>
      {listings.length ? (
        <div className="stack">{listings.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
      ) : (
        <Empty title="Nothing listed right now">This organization has no surplus available. Check back later.</Empty>
      )}
    </>
  );
}

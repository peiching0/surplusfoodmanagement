import { useNavigate } from 'react-router-dom';
import { listOrgs, resetDemoData } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useQuery } from '../hooks/useQuery.js';
import { ORG_TYPES } from '../config/rules.js';
import { Wordmark } from '../components/Shell.jsx';
import { Loading } from '../components/Feedback.jsx';

export default function Login() {
  const { login, bump } = useApp();
  const navigate = useNavigate();
  const { data: orgs, loading } = useQuery(() => listOrgs(), []);

  const pick = (o) => {
    login(o);
    navigate(o.role === 'donor' ? '/my-listings' : '/browse', { replace: true });
  };
  const reset = () => { resetDemoData(); bump(); };

  const group = (role) => (orgs || []).filter((o) => o.role === role);
  const Group = ({ role, title, hint }) => (
    <section className="login-group">
      <h2>{title}</h2>
      <p className="muted">{hint}</p>
      <div className="org-list">
        {group(role).map((o) => (
          <button key={o.id} className="org-row" onClick={() => pick(o)}>
            <strong>{o.name}</strong>
            <span className="muted">{ORG_TYPES[o.type].label} · {o.area}</span>
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className="login">
      <Wordmark />
      <h1>Good food shouldn’t expire in a bin.</h1>
      <p className="lead">Hotels, restaurants and supermarkets list surplus food. Charities, food banks and animal farms claim it and collect it before the timer runs out.</p>
      {loading ? <Loading /> : (
        <div className="login-cols">
          <Group role="donor" title="I donate food" hint="Restaurants, hotels, supermarkets" />
          <Group role="recipient" title="I receive food" hint="Charities, food banks, animal farms" />
        </div>
      )}
      <button className="link" onClick={reset}>Reset demo data</button>
    </div>
  );
}

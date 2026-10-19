import { getImpact } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useQuery } from '../hooks/useQuery.js';
import { IMPACT } from '../config/rules.js';
import { ErrorNote, Loading } from '../components/Feedback.jsx';
import { num } from '../lib/format.js';

function WeekChart({ weeks }) {
  const W = 640, H = 200, pad = 28;
  const max = Math.max(1, ...weeks.map((w) => w.kg));
  const bw = (W - pad * 2) / weeks.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} className="chart" role="img" aria-label="Kilograms rescued per week over the last 8 weeks">
      <line x1={pad} x2={W - pad} y1={H} y2={H} stroke="var(--line)" />
      {weeks.map((w, i) => {
        const h = (w.kg / max) * (H - 24);
        const x = pad + i * bw + bw * 0.18;
        return (
          <g key={w.start}>
            <rect x={x} y={H - h} width={bw * 0.64} height={Math.max(h, 1)} rx="3" fill="var(--brand)" />
            <text x={x + bw * 0.32} y={H - h - 6} textAnchor="middle" className="chart-val">{w.kg ? num(w.kg, 0) : ''}</text>
            <text x={x + bw * 0.32} y={H + 18} textAnchor="middle" className="chart-lab">
              {new Date(w.start).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Impact() {
  const { session } = useApp();
  const { data, loading, error } = useQuery(() => getImpact(session.id, session.role), [session.id]);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorNote error={error} />;
  const { total, month, weeks } = data;
  const donor = session.role === 'donor';
  const tiles = [
    ['Food rescued', `${num(total.kg, 0)} kg`, `${num(month.kg, 0)} kg this month`],
    ['Meals provided', num(total.meals, 0), `${num(month.meals, 0)} this month`],
    ['CO2e avoided', `${num(total.co2e, 0)} kg`, `${num(month.co2e, 0)} kg this month`],
    ['Value saved', `${IMPACT.currency} ${num(total.value, 0)}`, `${IMPACT.currency} ${num(month.value, 0)} this month`],
  ];
  return (
    <>
      <h1>Your impact</h1>
      <p className="lead">{donor ? 'Food your organization kept out of the bin.' : 'Food your organization rescued and put to use.'} Only collected handovers count.</p>
      <div className="tiles">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="tile">
            <span className="tile-label">{label}</span>
            <span className="tile-value">{value}</span>
            <span className="muted">{sub}</span>
          </div>
        ))}
      </div>
      <h2>Kilograms rescued per week</h2>
      <WeekChart weeks={weeks} />
      <p className="muted">{total.count} completed handovers. Figures are estimates: {IMPACT.kgPerMeal} kg per meal, {IMPACT.co2ePerKg} kg CO2e per kg of food, {IMPACT.currency} {IMPACT.valuePerKg} per kg.</p>
    </>
  );
}

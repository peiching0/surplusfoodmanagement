import { useNow } from '../hooks/useNow.jsx';
import { formatClock, urgencyOf } from '../lib/format.js';

export function Countdown({ expiresAt, big = false }) {
  const now = useNow();
  const ms = expiresAt - now;
  const level = urgencyOf(ms);
  return (
    <span className={`cd lv-${level}${big ? ' cd-big' : ''}`} role="timer">
      {ms <= 0 ? 'Expired' : formatClock(ms)}
    </span>
  );
}

export function TimeBar({ readyAt, expiresAt }) {
  const now = useNow();
  const total = Math.max(1, expiresAt - readyAt);
  const frac = Math.min(1, Math.max(0, (expiresAt - now) / total));
  const level = urgencyOf(expiresAt - now);
  return (
    <div className="tbar" aria-hidden="true">
      <div className={`tbar-fill lv-bg-${level}`} style={{ width: `${frac * 100}%` }} />
    </div>
  );
}

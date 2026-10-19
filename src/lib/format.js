const pad = (n) => String(n).padStart(2, '0');

export function formatClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d >= 1) return `${d}d ${h}h`;
  if (h >= 1) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

// green > 30 min, amber 10 to 30, red under 10
export function urgencyOf(ms) {
  if (ms <= 0) return 'expired';
  if (ms < 10 * 60000) return 'urgent';
  if (ms < 30 * 60000) return 'soon';
  return 'fresh';
}

export const formatDateTime = (ms) =>
  new Date(ms).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const formatTime = (ms) =>
  new Date(ms).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' });

export const formatDate = (ms) =>
  new Date(ms).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

export const toLocalInput = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const num = (n, digits = 0) =>
  Number(n).toLocaleString('en-MY', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

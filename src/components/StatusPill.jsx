const LABELS = {
  available: 'Available', reserved: 'Fully claimed', completed: 'Completed', expired: 'Expired', withdrawn: 'Withdrawn',
  confirmed: 'Ready for pickup', collected: 'Collected', cancelled: 'Cancelled', no_show: 'No-show',
};
const TONE = {
  available: 'good', confirmed: 'good', collected: 'good', completed: 'good',
  reserved: 'warn', expired: 'bad', no_show: 'bad', cancelled: 'mute', withdrawn: 'mute',
};

export default function StatusPill({ status }) {
  return <span className={`pill tone-${TONE[status] || 'mute'}`}>{LABELS[status] || status}</span>;
}

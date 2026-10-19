export const Loading = ({ label = 'Loading' }) => <p className="muted" role="status">{label}…</p>;

export const ErrorNote = ({ error }) => (error ? <p className="note note-bad" role="alert">{error.message}</p> : null);

export const Empty = ({ title, children, action }) => (
  <div className="empty">
    <h3>{title}</h3>
    {children && <p className="muted">{children}</p>}
    {action}
  </div>
);

import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { ORG_TYPES } from '../config/rules.js';

const LINKS = {
  donor: [['/my-listings', 'My listings'], ['/new', 'New listing'], ['/claims', 'Past donations'], ['/impact', 'Impact']],
  recipient: [['/browse', 'Browse'], ['/claims', 'Past claims'], ['/impact', 'Impact']],
};

export function Wordmark() {
  return (
    <div className="wordmark">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="13" cy="13" r="10.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M13 6.5V13l4.5 2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Food Depot</span>
    </div>
  );
}

export default function Shell({ children }) {
  const { session, logout } = useApp();
  const navigate = useNavigate();
  const links = LINKS[session.role];
  const leave = () => { logout(); navigate('/login'); };
  const nav = links.map(([to, label]) => (
    <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>{label}</NavLink>
  ));
  return (
    <div className="shell">
      <aside className="side">
        <Wordmark />
        <nav className="side-nav" aria-label="Main">{nav}</nav>
        <div className="who">
          <strong>{session.name}</strong>
          <span className="muted">{ORG_TYPES[session.type].label} · {session.role === 'donor' ? 'Donating' : 'Receiving'}</span>
          <button className="link" onClick={leave}>Switch organization</button>
        </div>
      </aside>
      <header className="topbar">
        <Wordmark />
        <button className="link" onClick={leave}>{session.name}</button>
      </header>
      <main className="main">{children}</main>
      <nav className="tabs" aria-label="Main">{nav}</nav>
    </div>
  );
}

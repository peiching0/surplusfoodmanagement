import { Link } from 'react-router-dom';
import { categoryById, UNITS } from '../config/rules.js';
import { Countdown, TimeBar } from './Countdown.jsx';
import StatusPill from './StatusPill.jsx';
import { num } from '../lib/format.js';

export default function ListingCard({ listing, showStatus = false }) {
  const cat = categoryById(listing.categoryId);
  const unit = UNITS.find((u) => u.id === listing.unit)?.label || listing.unit;
  const live = listing.status === 'available' || listing.status === 'reserved';
  return (
    <Link to={`/listings/${listing.id}`} className="ticket">
      <div className="ticket-swatch" style={{ background: cat?.color }}>
        {listing.photo ? <img src={listing.photo} alt="" /> : <span>{cat?.short}</span>}
      </div>
      <div className="ticket-body">
        <h3>{listing.title}</h3>
        <p className="muted">{listing.donor.name} · {listing.donor.area}</p>
        <p className="meta">
          <span>{num(listing.quantityAvailable, 1)} of {num(listing.quantityTotal, 1)} {unit} left</span>
          {listing.intendedUse === 'animal' && <span className="tag">Animal feed</span>}
          {listing.intendedUse === 'both' && <span className="tag">People or animals</span>}
          {listing.allergens.length > 0 && <span className="tag">Contains {listing.allergens.join(', ').toLowerCase()}</span>}
        </p>
      </div>
      <div className="ticket-stub">
        {live ? (
          <>
            <span className="stub-label">Time left</span>
            <Countdown expiresAt={listing.expiresAt} />
            <TimeBar readyAt={listing.readyAt} expiresAt={listing.expiresAt} />
          </>
        ) : (
          showStatus && <StatusPill status={listing.status} />
        )}
        {live && showStatus && <StatusPill status={listing.status} />}
      </div>
    </Link>
  );
}

import { Link } from 'react-router-dom';

const features = [
  ['Fast member lookup', 'Search by phone or name from the counter in seconds.'],
  ['Accurate points engine', 'Tier-aware earning with transactional ledger protection.'],
  ['Simple redemptions', 'See balance, choose a reward, and get an instant confirmed result.'],
  ['Expiry-aware points', 'Track individual earning lots so unused points expire cleanly after 90 days.'],
  ['Tier notifications', 'Queue a durable notification event whenever a member crosses into a new tier.'],
  ['Transaction history', 'Every points change has a traceable entry and resulting balance.'],
  ['Built for long lists', 'Server-side search, pagination, and sorting keep the counter responsive.'],
  ['Staff-first workflow', 'Focused screens for the moments where counter staff need speed and confidence.']
];

export function LandingPage() {
  return <div className="marketing-page">
    <header className="marketing-nav"><div className="brand"><span className="brand-mark">CP</span><div><strong>CaféPoints</strong><small>Counter console</small></div></div><div className="nav-actions"><Link className="text-link" to="/login">Staff login</Link><Link className="button primary" to="/register">Create staff account</Link></div></header>
    <main>
      <section className="hero container"><div className="hero-copy"><span className="eyebrow">Café loyalty, without the guesswork</span><h1>Keep every member balance <em>exactly right.</em></h1><p>Record purchases, earn the right points, move members through tiers, and redeem rewards from one focused counter workspace.</p><div className="hero-actions"><Link className="button primary large" to="/register">Set up CaféPoints</Link><Link className="button ghost large" to="/login">Open counter</Link></div><div className="hero-proof"><span>✓ Transactional ledger</span><span>✓ Server-side lookup</span><span>✓ Tier snapshots</span><span>✓ Expiry + outbox</span></div></div><div className="hero-card"><div className="mini-card-head"><span>Live member</span><span className="dot" /></div><div className="member-summary"><div className="avatar xl">AM</div><div><strong>Aarav Mehta</strong><small>•••• 1001</small></div><span className="tier-badge tier-gold">Gold</span></div><div className="balance-box"><small>Available points</small><strong>950</strong><span>Lifetime earned · 1,800</span></div><div className="progress"><span style={{ width: '82%' }} /></div><div className="mini-action-row"><span>Purchase · +150</span><span>Balance · 950</span></div></div></section>
      <section className="section container"><div className="section-heading"><span className="eyebrow">What it is</span><h2>A practical café loyalty counter system</h2><p>Made for independent cafés, café chains, counter staff, and store managers who need a dependable operational workflow.</p></div><div className="feature-grid">{features.map(([title, text]) => <div className="feature-card" key={title}><div className="feature-icon">●</div><h3>{title}</h3><p>{text}</p></div>)}</div></section>
      <section className="section muted"><div className="container split"><div><span className="eyebrow">How it helps</span><h2>Fewer manual calculations. More trustworthy balances.</h2></div><div className="benefit-list"><div><strong>Reduce mistakes</strong><span>Use the backend rules instead of hand-calculating point multipliers.</span></div><div><strong>Stay consistent</strong><span>Balances and ledger entries change together inside one database transaction.</span></div><div><strong>Scale lookup</strong><span>Search, pagination, and sorting stay on the server as the list grows.</span></div></div></div></section>
      <section className="section container"><div className="section-heading"><span className="eyebrow">What we'd build next</span><h2>Three natural extensions</h2></div><div className="next-grid"><div><span>01</span><h3>Multi-store / branch management</h3><p>Separate locations, staff scopes, and store-level programme settings.</p></div><div><span>02</span><h3>SMS/WhatsApp reward notifications</h3><p>Send timely notifications when rewards become available or are redeemed.</p></div><div><span>03</span><h3>Analytics and loyalty insights</h3><p>See repeat visits, tier movement, redemption patterns, and cohort trends.</p></div></div></section>
    </main>
    <footer className="marketing-footer"><div className="container"><span>© 2026 CaféPoints</span><span>Built for counter operations</span></div></footer>
  </div>;
}

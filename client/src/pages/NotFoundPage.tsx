import { Link } from 'react-router-dom';
export function NotFoundPage() { return <div className="center-screen"><div className="not-found"><span className="eyebrow">404</span><h1>That page wandered off.</h1><p>The link may be outdated or the resource may not exist.</p><Link className="button primary" to="/">Back to CaféPoints</Link></div></div>; }

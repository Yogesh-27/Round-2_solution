import type { Tier } from '../types';

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`tier-badge tier-${tier.toLowerCase()}`}>{tier.charAt(0) + tier.slice(1).toLowerCase()}</span>;
}

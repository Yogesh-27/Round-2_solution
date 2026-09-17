export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface User { id: string; name: string; email: string; role: 'STAFF' | 'ADMIN'; }
export interface Member { id: string; fullName: string; phoneNumber: string; email?: string | null; currentTier: Tier; lifetimeEarnedPoints: number; currentPointsBalance: number; createdAt: string; updatedAt?: string; }
export interface Reward { id: string; name: string; description: string; pointsCost: number; active: boolean; }
export interface LedgerEntry { id: string; transactionType: 'PURCHASE_EARN' | 'REDEMPTION' | 'ADJUSTMENT' | 'EXPIRATION' | 'REVERSAL'; pointsDelta: number; balanceAfter: number; description: string; createdAt: string; referenceId?: string | null; referenceType?: string | null; }
export interface DashboardSummary { totalMembers: number; pointsIssued: number; pointsRedeemed: number; membersByTier: Record<Tier, number>; recentPurchases: Array<{ id: string; amount: string; currency: string; pointsEarned: number; createdAt: string; member: Pick<Member, 'id' | 'fullName' | 'currentTier'> }>; recentRedemptions: Array<{ id: string; pointsUsed: number; createdAt: string; member: Pick<Member, 'id' | 'fullName'>; reward: { name: string } }> }

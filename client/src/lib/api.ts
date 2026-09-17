export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) { super(message); this.status = status; this.code = code; this.details = details; }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, credentials: 'include', headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload?.error?.code ?? 'REQUEST_FAILED', payload?.error?.message ?? 'Request failed.', payload?.error?.details);
  return payload as T;
}

export const api = {
  auth: {
    me: () => request<{ user: import('../types/index').User }>('/api/auth/me'),
    login: (body: { email: string; password: string }) => request<{ user: import('../types/index').User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body: { name: string; email: string; password: string; confirmPassword: string }) => request<{ user: import('../types/index').User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request<{ success: true }>('/api/auth/logout', { method: 'POST' })
  },
  members: {
    list: (params: { search: string; page: number; pageSize: number; sortBy: string; sortOrder: string }) => request('/api/members?' + new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString()),
    get: (id: string) => request(`/api/members/${id}`),
    transactions: (id: string, page = 1, pageSize = 20) => request(`/api/members/${id}/transactions?page=${page}&pageSize=${pageSize}`),
    create: (body: { fullName: string; phoneNumber: string; email?: string }) => request('/api/members', { method: 'POST', body: JSON.stringify(body) }),
    purchase: (id: string, body: { amount: string; currency: string; clientRequestId: string; notes?: string }) => request(`/api/members/${id}/purchases`, { method: 'POST', body: JSON.stringify(body) }),
    redeem: (id: string, body: { rewardId: string; clientRequestId: string; notes?: string }) => request(`/api/members/${id}/redemptions`, { method: 'POST', body: JSON.stringify(body) })
  },
  rewards: { list: () => request<{ items: import('../types/index').Reward[] }>('/api/rewards') },
  dashboard: { summary: () => request<import('../types/index').DashboardSummary>('/api/dashboard/summary') }
};

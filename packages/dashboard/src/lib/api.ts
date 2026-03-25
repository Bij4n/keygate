const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message ?? `Request failed: ${response.status}`);
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const data = await this.request<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = data.token;
    return data;
  }

  async getConnections() {
    return this.request<{ connections: any[]; total: number }>(
      '/api/connections',
    );
  }

  async createConnection(provider: string, scopes: string[]) {
    return this.request<any>('/api/connections', {
      method: 'POST',
      body: JSON.stringify({ provider, scopes }),
    });
  }

  async revokeConnection(id: string) {
    return this.request<any>(`/api/connections/${id}`, { method: 'DELETE' });
  }

  async getAuditLog(params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<{ entries: any[]; total: number }>(
      `/api/audit${query}`,
    );
  }

  async getAuditSummary() {
    return this.request<any>('/api/audit/summary');
  }

  async revokeToken(tokenId: string) {
    return this.request<any>(`/api/tokens/${tokenId}`, { method: 'DELETE' });
  }

  async getProviders() {
    return this.request<{ providers: any[] }>('/api/providers');
  }
}

export const api = new ApiClient();

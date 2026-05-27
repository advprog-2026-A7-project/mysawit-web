import { AuthResponse } from '@/types';
import { API_ENDPOINTS } from '@/lib/api-config';

let refreshPromise: Promise<boolean> | null = null;

class ApiClient {
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  private getStoredUserInfo() {
    if (typeof window === 'undefined') {
      return { id: null, username: null, role: null };
    }
    return {
      id: localStorage.getItem('userId'),
      username: localStorage.getItem('username'),
      role: localStorage.getItem('userRole'),
    };
  }

  private getAuthHeader(): HeadersInit {
    const token = this.getAuthToken();
    const user = this.getStoredUserInfo();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (user.id) {
      headers['X-User-Id'] = user.id;
      headers['X-Requester-Id'] = user.id;
    }

    if (user.username) {
      headers['X-User-Name'] = user.username;
    }

    if (user.role) {
      headers['X-User-Role'] = user.role;

      if (user.id && user.role === 'BURUH') {
        headers['X-Harvester-Id'] = user.id;
        headers['X-Harvester-Name'] = user.username ?? user.id;
      }

      if (user.id && user.role === 'MANDOR') {
        headers['X-Foreman-Id'] = user.id;
      }
    }

    return headers;
  }

  private async refreshAuthToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearAuth();
        return false;
      }

      const data: AuthResponse = await response.json();
      this.saveAuth(data);
      return true;
    } catch {
      this.clearAuth();
      return false;
    }
  }

  private async handleTokenRefresh(): Promise<boolean> {
    if (!refreshPromise) {
      refreshPromise = this.refreshAuthToken().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    if (typeof response.text !== 'function' && typeof response.json === 'function') {
      return response.json() as Promise<T>;
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return JSON.parse(text) as T;
    }

    return text as T;
  }

  private async parseError(response: Response): Promise<string> {
    if (typeof response.text !== 'function' && typeof response.json === 'function') {
      try {
        const error = (await response.json()) as {
          error?: string;
          message?: string;
        };
        return error.message || error.error || response.statusText || 'Request failed';
      } catch {
        return response.statusText || 'Request failed';
      }
    }

    const text = await response.text();
    if (!text) {
      return response.statusText || 'Request failed';
    }

    try {
      const error = JSON.parse(text) as {
        error?: string;
        message?: string;
      };
      return error.message || error.error || response.statusText || 'Request failed';
    } catch {
      return text;
    }
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const fetchOnce = () => fetch(url, { headers: this.getAuthHeader(), ...init });

    let response = await fetchOnce();

    if (response.status === 401) {
      const refreshed = await this.handleTokenRefresh();
      if (refreshed) {
        response = await fetchOnce();
      }
    }

    if (!response.ok) {
      throw new Error(await this.parseError(response));
    }

    return this.parseResponse<T>(response);
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(url: string, data: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' });
  }

  saveAuth(authResponse: AuthResponse): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('authToken', authResponse.token);
    if (authResponse.refreshToken) {
      localStorage.setItem('refreshToken', authResponse.refreshToken);
    }
    localStorage.setItem('userId', String(authResponse.id));
    localStorage.setItem('username', authResponse.username);
    localStorage.setItem('userEmail', authResponse.email);
    localStorage.setItem('userRole', authResponse.role);
    if (authResponse.mandorId) {
      localStorage.setItem('mandorId', String(authResponse.mandorId));
    } else {
      localStorage.removeItem('mandorId');
    }
    if (authResponse.kebunId) {
      localStorage.setItem('kebunId', String(authResponse.kebunId));
    } else {
      localStorage.removeItem('kebunId');
    }
    localStorage.setItem('googleLinked', String(authResponse.googleLinked ?? false));
    localStorage.setItem('hasPassword', String(authResponse.hasPassword ?? false));
  }

  clearAuth(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('mandorId');
    localStorage.removeItem('kebunId');
    localStorage.removeItem('googleLinked');
    localStorage.removeItem('hasPassword');
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  getUserInfo() {
    if (typeof window === 'undefined') return null;
    return {
      id: localStorage.getItem('userId'),
      username: localStorage.getItem('username'),
      email: localStorage.getItem('userEmail'),
      role: localStorage.getItem('userRole'),
      mandorId: localStorage.getItem('mandorId'),
      kebunId: localStorage.getItem('kebunId'),
      googleLinked: localStorage.getItem('googleLinked') === 'true',
      hasPassword: localStorage.getItem('hasPassword') === 'true',
    };
  }
}

export const apiClient = new ApiClient();

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

  private getAuthHeader(): HeadersInit {
    const token = this.getAuthToken();
    return token
      ? {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      : {
          'Content-Type': 'application/json',
        };
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

  async get<T>(url: string): Promise<T> {
    let response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    if (response.status === 401) {
      const refreshed = await this.handleTokenRefresh();
      if (refreshed) {
        response = await fetch(url, {
          method: 'GET',
          headers: this.getAuthHeader(),
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    let response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      const refreshed = await this.handleTokenRefresh();
      if (refreshed) {
        response = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeader(),
          body: JSON.stringify(data),
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
  }

  async put<T>(url: string, data: unknown): Promise<T> {
    let response = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      const refreshed = await this.handleTokenRefresh();
      if (refreshed) {
        response = await fetch(url, {
          method: 'PUT',
          headers: this.getAuthHeader(),
          body: JSON.stringify(data),
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
  }

  async delete<T>(url: string): Promise<T> {
    let response = await fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (response.status === 401) {
      const refreshed = await this.handleTokenRefresh();
      if (refreshed) {
        response = await fetch(url, {
          method: 'DELETE',
          headers: this.getAuthHeader(),
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || 'Request failed');
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return response.json();
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    let response = await fetch(url, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });

    if (response.status === 401) {
      const refreshed = await this.handleTokenRefresh();
      if (refreshed) {
        response = await fetch(url, {
          method: 'PATCH',
          headers: this.getAuthHeader(),
          body: data !== undefined ? JSON.stringify(data) : undefined,
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
  }

  saveAuth(authResponse: AuthResponse): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('authToken', authResponse.token);
    localStorage.setItem('refreshToken', authResponse.refreshToken);
    localStorage.setItem('userId', authResponse.id.toString());
    localStorage.setItem('username', authResponse.username);
    localStorage.setItem('userEmail', authResponse.email);
    localStorage.setItem('userRole', authResponse.role);
    localStorage.setItem('googleLinked', String(authResponse.googleLinked));
    localStorage.setItem('hasPassword', String(authResponse.hasPassword));
  }

  clearAuth(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
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
      googleLinked: localStorage.getItem('googleLinked') === 'true',
      hasPassword: localStorage.getItem('hasPassword') === 'true',
    };
  }
}

export const apiClient = new ApiClient();

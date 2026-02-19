import { AuthResponse } from '@/types';

class ApiClient {
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
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

  async get<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async put<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  saveAuth(authResponse: AuthResponse): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('authToken', authResponse.token);
    localStorage.setItem('userId', authResponse.id.toString());
    localStorage.setItem('username', authResponse.username);
    localStorage.setItem('userRole', authResponse.role);
  }

  clearAuth(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  getUserInfo() {
    if (typeof window === 'undefined') return null;
    return {
      id: localStorage.getItem('userId'),
      username: localStorage.getItem('username'),
      role: localStorage.getItem('userRole'),
    };
  }
}

export const apiClient = new ApiClient();

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4041/api/v1";

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
  }

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  }

  clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }

  async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const token = options.token || this.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && token) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${this.getToken()}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        this.clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized");
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || "ط®ط·ط§غŒغŒ ط±ط® ط¯ط§ط¯",
        data.code,
        data.errors,
        response.status,
      );
    }

    return data;
  }

  async upload<T>(endpoint: string, body: FormData): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    let response = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers, body });
    if (response.status === 401 && token && await this.tryRefresh()) {
      const nextToken = this.getToken();
      if (nextToken) headers["Authorization"] = `Bearer ${nextToken}`;
      response = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers, body });
    }
    const data = await response.json();
    if (!response.ok) throw new ApiError(data.message || "آپلود انجام نشد", data.code, data.errors, response.status);
    return data;
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  get<T>(endpoint: string) {
    return this.fetch<T>(endpoint);
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.fetch<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.fetch<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.fetch<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.fetch<T>(endpoint, { method: "DELETE" });
  }
}

export class ApiError extends Error {
  code?: string;
  errors?: Array<{ field?: string; message: string }>;
  status: number;

  constructor(
    message: string,
    code?: string,
    errors?: Array<{ field?: string; message: string }>,
    status = 400,
  ) {
    super(message);
    this.code = code;
    this.errors = errors;
    this.status = status;
  }
}

export const api = new ApiClient();

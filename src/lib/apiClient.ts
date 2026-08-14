// Centralized API Client Architecture for Owner OS
// Reads base URL dynamically with fallback to local proxy /api/v1.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface ApiErrorResponse {
  message: string;
  statusCode: number;
  details?: any;
}

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// In-memory access token storage (never in localStorage to prevent XSS exposure)
let inMemoryAccessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
let authFailureListeners: (() => void)[] = [];

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function onAuthFailure(callback: () => void) {
  authFailureListeners.push(callback);
  return () => {
    authFailureListeners = authFailureListeners.filter(cb => cb !== callback);
  };
}

function notifyAuthFailure() {
  inMemoryAccessToken = null;
  authFailureListeners.forEach(cb => cb());
}

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred while communicating with the server.';
    
    if (typeof data === 'object' && data !== null && 'message' in data) {
      errorMessage = (data as any).message;
    } else if (typeof data === 'string' && data.trim().length > 0) {
      errorMessage = data;
    }

    switch (response.status) {
      case 400:
        errorMessage = errorMessage || 'Bad request. Please check the submitted form values.';
        break;
      case 401:
        errorMessage = errorMessage || 'Unauthorized session. Please log in again to continue.';
        break;
      case 403:
        errorMessage = 'Access denied. You do not have permissions for this action.';
        break;
      case 404:
        errorMessage = 'Requested resource not found on server.';
        break;
      case 409:
        errorMessage = errorMessage || 'Data conflict. The record has been modified by another user.';
        break;
      case 422:
        errorMessage = 'Validation error. Please verify input formats and constraints.';
        break;
      case 429:
        errorMessage = errorMessage || 'Too many requests. Please wait a moment before retrying.';
        break;
      case 500:
      case 502:
      case 503:
        errorMessage = 'Server error. Our engineers have been alerted. Please retry shortly.';
        break;
    }

    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

async function executeRequest<T>(
  method: string,
  endpoint: string,
  body?: any,
  headers?: Record<string, string>,
  retryCount = 0
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (inMemoryAccessToken) {
    requestHeaders['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      credentials: 'include', // Includes httpOnly refresh token cookie
      body: body ? JSON.stringify(body) : undefined
    });

    // 401 Interceptor: Try silent refresh once if unauthorized
    if (response.status === 401 && retryCount === 0 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshUrl = `${API_BASE_URL}/auth/refresh`;
          const refreshRes = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newToken = refreshData.access_token;
            setAccessToken(newToken);
            isRefreshing = false;
            onRefreshed(newToken);
            // Retry original request
            return executeRequest<T>(method, endpoint, body, headers, 1);
          } else {
            isRefreshing = false;
            notifyAuthFailure();
          }
        } catch (e) {
          isRefreshing = false;
          notifyAuthFailure();
        }
      } else {
        // Wait for active refresh to complete
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            try {
              const res = await executeRequest<T>(method, endpoint, body, headers, 1);
              resolve(res);
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    }

    return await handleResponse<T>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network failure connecting to Owner OS API.', 0);
  }
}

export const apiClient = {
  get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return executeRequest<T>('GET', endpoint, undefined, headers);
  },

  post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return executeRequest<T>('POST', endpoint, body, headers);
  },

  put<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return executeRequest<T>('PUT', endpoint, body, headers);
  },

  patch<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return executeRequest<T>('PATCH', endpoint, body, headers);
  },

  delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return executeRequest<T>('DELETE', endpoint, undefined, headers);
  }
};

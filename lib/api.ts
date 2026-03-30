/**
 * api.ts — Centralized API client for the multi-tenant Restaurant Platform.
 * 
 * All calls to the FastAPI backend automatically include:
 *   - `Content-Type: application/json`
 *   - `X-Restaurant-ID: <current tenant>` — read from sessionStorage after login
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Read the restaurant_id stored in session after login
function getRestaurantId(): string {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('restaurant_id') || '';
}

// Get customer ID from localStorage if customer is logged in
function getCustomerId(): string {
    if (typeof window === 'undefined') return '';
    const auth = localStorage.getItem('customer_auth');
    if (!auth) return '';
    try {
        const authData = JSON.parse(auth);
        return authData.user_id || '';
    } catch {
        return '';
    }
}

function buildHeaders(extras?: Record<string, string>): HeadersInit {
    const restaurantId = getRestaurantId();
    const customerId = getCustomerId();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extras,
    };
    if (restaurantId) {
        headers['X-Restaurant-ID'] = restaurantId;
    }
    if (customerId) {
        headers['X-Customer-ID'] = customerId;
    }
    return headers;
}

function buildFormHeaders(): HeadersInit {
    const restaurantId = getRestaurantId();
    const customerId = getCustomerId();
    // Do NOT set Content-Type here – browser sets it automatically with boundary for FormData
    const headers: Record<string, string> = {};
    if (restaurantId) {
        headers['X-Restaurant-ID'] = restaurantId;
    }
    if (customerId) {
        headers['X-Customer-ID'] = customerId;
    }
    return headers;
}

function toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            result[camelKey] = toCamelCase(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
}

async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: buildHeaders(options.headers as Record<string, string>),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail ?? 'Unknown API error');
    }
    const data = await res.json();
    return toCamelCase(data) as T;
}

async function requestForm<T>(path: string, formData: FormData): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: buildFormHeaders(),
        body: formData,
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail ?? 'Unknown API error');
    }
    const data = await res.json();
    return toCamelCase(data) as T;
}

// Convenience helpers
export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) =>
        request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) =>
        request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    postForm: <T>(path: string, formData: FormData) => requestForm<T>(path, formData),
};

/** Upload an image file; returns the public URL path. */
export async function uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const result = await requestForm<{ url: string }>('/api/upload-image', form);
    return result.url;
}

// Auth helper — stores the restaurant_id in sessionStorage on login
export function saveSession(restaurantId: string | null | undefined) {
    if (restaurantId) {
        sessionStorage.setItem('restaurant_id', restaurantId);
    } else {
        sessionStorage.removeItem('restaurant_id');
    }
}

export function clearSession() {
    sessionStorage.removeItem('restaurant_id');
}

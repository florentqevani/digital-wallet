const API_BASE_URL = import.meta.env.VITE_WEB_BFF_URL || 'http://localhost:3104';

async function parseJson(response) {
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
        return null;
    }

    return response.json();
}

export async function apiRequest(path, options, token = '') {
    const requestOptions = options || {};
    const headers = {
        'Content-Type': 'application/json',
    };

    if (requestOptions.headers) {
        Object.assign(headers, requestOptions.headers);
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...requestOptions,
        headers,
    });

    const body = await parseJson(response);

    if (!response.ok) {
        const message = body?.message || body?.error || 'Request failed';
        throw new Error(message);
    }

    return body;
}

export async function loginRequest(payload) {
    return apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function registerUserRequest(token, payload) {
    return apiRequest('/api/auth/register-user', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token);
}

export async function getUsers(token) {
    return apiRequest('/api/users', { method: 'GET' }, token);
}

export async function updateUserRequest(token, userId, payload) {
    return apiRequest(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    }, token);
}

export async function deleteUserRequest(token, userId) {
    return apiRequest(`/api/users/${userId}`, {
        method: 'DELETE',
    }, token);
}

export async function getClients(token) {
    return apiRequest('/api/clients', { method: 'GET' }, token);
}

export async function getAccounts(token) {
    return apiRequest('/api/accounts', { method: 'GET' }, token);
}

export async function addCurrency(token, clientId, currency) {
    return apiRequest('/api/add-currency', {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId, currency }),
    }, token);
}

export async function setBalance(token, clientId, balance) {
    return apiRequest('/api/set-balance', {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId, balance }),
    }, token);
}

export async function updateClientRequest(token, clientId, payload) {
    return apiRequest(`/api/clients/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    }, token);
}

export async function deleteClientRequest(token, clientId) {
    return apiRequest(`/api/clients/${clientId}`, {
        method: 'DELETE',
    }, token);
}

export async function getMyLogs(token, page = 1, limit = 20) {
    return apiRequest(`/api/logs/my-logs?page=${page}&limit=${limit}`, { method: 'GET' }, token);
}

export async function getDashboard(token) {
    return apiRequest('/api/logs/dashboard', { method: 'GET' }, token);
}

export async function getAllLogs(token, filters = {}) {
    const search = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value));
        }
    });

    return apiRequest(`/api/logs/all?${search.toString()}`, { method: 'GET' }, token);
}


const config = require('../config');

function buildUrl(path, query = {}) {
    const url = new URL(path, config.apiGatewayUrl);
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });
    return url;
}

async function gatewayRequest(path, options = {}) {
    const { method = 'GET', body, token, query } = options;
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(path, query), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    const parsedBody = contentType.includes('application/json') && response.status !== 204
        ? await response.json()
        : null;

    if (!response.ok) {
        const message = parsedBody?.message || parsedBody?.error || 'Gateway request failed';
        const error = new Error(message);
        error.statusCode = response.status;
        error.payload = parsedBody;
        throw error;
    }

    return parsedBody;
}

module.exports = { gatewayRequest };

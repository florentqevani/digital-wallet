'use strict';

const config = require('../config');

// RaiAccept constants 
const AUTH_URL = 'https://authenticate.raiaccept.com';
const AUTH_CLIENT_ID = 'kr2gs4117arvbnaperqff5dml'; // static for all merchants
const API_URL = 'https://trapi.raiaccept.com';

// Authentication 

/**
 * Authenticates with RaiAccept via Amazon Cognito and returns an IdToken.
 * @returns {Promise<string>} Bearer token
 */
async function authenticate() {
    const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
            AuthFlow: 'USER_PASSWORD_AUTH',
            AuthParameters: {
                USERNAME: config.raiaccept.username,
                PASSWORD: config.raiaccept.password,
            },
            ClientId: AUTH_CLIENT_ID,
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`RaiAccept auth failed [${res.status}]: ${text}`);
    }

    const data = await res.json();
    return data.AuthenticationResult.IdToken;
}

// Order API 

/**
 * Creates an order entry in RaiAccept.
 * @param {string} token
 * @param {object} params
 * @returns {Promise<{orderIdentification: string}>}
 */
async function createOrderEntry(token, {
    merchantOrderReference,
    amount,
    currency,
    successUrl,
    failUrl,
    cancelUrl,
    notificationUrl,
    consumer,
    description = 'Balance top-up',
}) {
    const body = {
        invoice: {
            merchantOrderReference,
            amount: parseFloat(amount),
            currency,
            items: [{ description, numberOfItems: 1, price: parseFloat(amount) }],
        },
        urls: { successUrl, failUrl, cancelUrl, notificationUrl },
        paymentMethodPreference: 'CARD',
        ...(consumer ? { consumer } : {}),
    };

    const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`RaiAccept createOrderEntry failed [${res.status}]: ${text}`);
    }
    return res.json();
}

/**
 * Creates a checkout session for an existing order.
 * Returns { paymentRedirectURL, sessionId }.
 * @param {string} token
 * @param {string} orderIdentification
 * @param {object} params
 */
async function createPaymentSession(token, orderIdentification, {
    merchantOrderReference,
    amount,
    currency,
    successUrl,
    failUrl,
    cancelUrl,
    consumer,
    description = 'Balance top-up',
}) {
    const body = {
        invoice: {
            merchantOrderReference,
            amount: parseFloat(amount),
            currency,
            items: [{ description, numberOfItems: 1, price: parseFloat(amount) }],
        },
        urls: { successUrl, failUrl, cancelUrl },
        paymentMethodPreference: 'CARD',
        ...(consumer ? { consumer } : {}),
    };

    const res = await fetch(
        `${API_URL}/orders/${encodeURIComponent(orderIdentification)}/checkout`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        }
    );

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`RaiAccept createPaymentSession failed [${res.status}]: ${text}`);
    }
    return res.json();
}

/**
 * Retrieves order details including payment status.
 * @param {string} token
 * @param {string} orderId
 */
async function getOrderDetails(token, orderId) {
    const res = await fetch(`${API_URL}/orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`RaiAccept getOrderDetails failed [${res.status}]: ${text}`);
    }
    return res.json();
}

module.exports = { authenticate, createOrderEntry, createPaymentSession, getOrderDetails };

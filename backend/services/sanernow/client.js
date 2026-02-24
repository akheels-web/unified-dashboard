const axios = require('axios');

const sanerClient = axios.create({
    baseURL: 'https://saner.secpod.com',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor to add Authorization header dynamically if needed, 
// though we usually rely on environment variables on server load.
sanerClient.interceptors.request.use((config) => {
    const key = process.env.SANERNOW_API_KEY || process.env.SANERNOW_SAML_KEY;
    if (key) {
        // SanerNow often expects the authorization header to be formatted as "SAML <key>"
        config.headers.Authorization = key.startsWith('SAML ') ? key : `SAML ${key}`;
    }
    return config;
});

/**
 * Core wrapper for /AncorWebService/perform APIs
 * @param {string} account - Account ID/Name 
 * @param {object} payload - Request payload structured for perform API
 */
const perform = async (account, payload) => {
    return sanerClient.post(`/AncorWebService/perform?accountid=${account}`, payload);
};

module.exports = {
    sanerClient,
    perform
};

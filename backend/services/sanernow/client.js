const axios = require('axios');

// Configure exactly as suggested by the senior developer
const sanerClient = axios.create({
    baseURL: process.env.SANERNOW_BASE_URL || 'https://saner.secpod.com',
    headers: {
        'Content-Type': 'application/json',
        // Injecting the key dynamically on load. If it comes with "SAML " prefix we trim it to avoid double SAML.
        'Authorization': `SAML ${(process.env.SANERNOW_SAML_KEY || process.env.SANERNOW_API_KEY || '').replace(/^SAML\s+/i, '')}`
    },
    timeout: 30000
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

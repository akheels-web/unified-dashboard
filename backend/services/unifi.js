const axios = require('axios');
const https = require('https');

// Create an Axios instance for Unifi
// Note: Many Unifi controllers use self-signed certificates, so we disable SSL verification.
// In a production environment with public certs, you should enable verification.
const unifiClient = axios.create({
    baseURL: process.env.UNIFI_URL, // e.g., https://192.168.1.1:8443 or https://unifi.ui.com
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true // Important for maintaining session cookies
});

let cookieJar = null;

// Login to Unifi Controller
const login = async () => {
    if (!process.env.UNIFI_URL || !process.env.UNIFI_USERNAME || !process.env.UNIFI_PASSWORD) {
        console.warn('Unifi credentials not configured in .env');
        return false;
    }

    try {
        console.log(`[Unifi] Attempting login to ${process.env.UNIFI_URL}...`);

        // This path /api/auth/login is typical for UDM Pro / UniFi OS
        // For older controllers, it might be /api/login
        const response = await unifiClient.post('/api/auth/login', {
            username: process.env.UNIFI_USERNAME,
            password: process.env.UNIFI_PASSWORD
        });

        // Capture session cookie
        if (response.headers['set-cookie']) {
            cookieJar = response.headers['set-cookie'];
            // Attach cookies to the client for subsequent requests
            unifiClient.defaults.headers.Cookie = cookieJar;
            console.log('[Unifi] Login successful. Session established.');
            return true;
        } else {
            // Sometimes successful login returns 200 but no cookie if already logged in? 
            // Or maybe it returns a token in body (depending on version).
            // For UDM, it uses cookies.
            console.warn('[Unifi] Login returned 200 but no Set-Cookie header found.');
            return true;
        }
    } catch (error) {
        console.error('[Unifi] Login failed:', error.message);
        if (error.response) {
            console.error('[Unifi] Status:', error.response.status);
            console.error('[Unifi] Data:', error.response.data);
        }
        return false;
    }
};

// Generic wrapper to ensure we are logged in before making requests
const makeRequest = async (method, url, data = null) => {
    if (!cookieJar) {
        const loggedIn = await login();
        if (!loggedIn) throw new Error('Unifi login failed or not configured');
    }

    try {
        const config = { method, url };
        if (data) config.data = data;

        const response = await unifiClient(config);
        return response.data;
    } catch (error) {
        // If 401 Unauthorized, try logging in again once
        if (error.response && error.response.status === 401) {
            console.log('[Unifi] Session expired, re-authenticating...');
            const loggedIn = await login();
            if (loggedIn) {
                const config = { method, url };
                if (data) config.data = data;
                const retryResponse = await unifiClient(config);
                return retryResponse.data;
            }
        }
        throw error;
    }
};

// Exported methods
module.exports = {
    // Get System Health (UDM Pro / Network App)
    getHealth: async () => {
        // Adjust path based on your controller version. 
        // /proxy/network/api/s/default/stat/health is common for UDM Pro Network App
        return makeRequest('get', '/proxy/network/api/s/default/stat/health');
    },

    // Get Connected Devices (Clients)
    getClients: async () => {
        return makeRequest('get', '/proxy/network/api/s/default/stat/sta');
    },

    // Get Unifi Devices (APs, Switches)
    getDevices: async () => {
        return makeRequest('get', '/proxy/network/api/s/default/stat/device');
    }
};

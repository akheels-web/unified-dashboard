const axios = require('axios');

// Cloud Configuration
// User provided docs: https://developer.ui.com/site-manager/v1.0.0/gettingstarted
// API Key provided by user
const API_KEY = 'HIwvnIn0k_IDWqJW0b-wj7hdS819CtH8';

const unifiClient = axios.create({
    baseURL: 'https://api.ui.com',
    headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json'
    }
});

// Cache in-memory
let deviceCache = {
    data: [],
    lastFetch: 0
};
const CACHE_TTL = 30 * 1000; // 30 seconds

/*
 * Fetch Sites
 */
const getSites = async () => {
    try {
        console.log('Fetching Unifi Sites from Cloud...');
        // Standard endpoint based on docs
        const response = await unifiClient.get('/site-manager/v1/sites');
        return response.data;
    } catch (error) {
        console.error('Error fetching Unifi sites:', error.response?.data || error.message);
        throw error;
    }
};

/*
 * Fetch Devices (Iterates through sites)
 */
const getDevices = async () => {
    // Check cache
    if (Date.now() - deviceCache.lastFetch < CACHE_TTL && deviceCache.data.length > 0) {
        return deviceCache.data;
    }

    try {
        // 1. Get Sites
        const sitesResponse = await getSites();
        // Handle response wrapping if any (e.g. { data: [...] })
        const siteList = Array.isArray(sitesResponse) ? sitesResponse : (sitesResponse.data || []);

        let allDevices = [];

        // 2. Loop sites to get devices
        for (const site of siteList) {
            try {
                const siteId = site.id;
                // Endpoint for devices per site
                const response = await unifiClient.get(`/site-manager/v1/sites/${siteId}/devices`);
                const siteDevices = Array.isArray(response.data) ? response.data : (response.data.data || []);

                // Add site context
                const mappedDevices = siteDevices.map(d => ({
                    ...d,
                    siteName: site.name,
                    siteId: siteId
                }));
                allDevices = allDevices.concat(mappedDevices);
            } catch (err) {
                console.warn(`Failed to fetch devices for site ${site.name} (${site.id}):`, err.message);
                // Continue to next site
            }
        }

        deviceCache.data = allDevices;
        deviceCache.lastFetch = Date.now();
        return allDevices;

    } catch (error) {
        console.error('Error fetching Unifi devices:', error.message);
        // Fallback to empty array to avoid crashing frontend
        return [];
    }
};

/*
 * Get Health Check / Stats
 */
const getHealth = async () => {
    try {
        const sitesResponse = await getSites();
        const siteList = Array.isArray(sitesResponse) ? sitesResponse : (sitesResponse.data || []);

        const totalSites = siteList.length;
        // Check for 'status' or 'connectionState' depending on API response shape
        const onlineSites = siteList.filter(s => s.status === 'online' || s.isConnected === true).length;

        return {
            status: 'ok',
            sites: totalSites,
            onlineSites: onlineSites,
            offlineSites: totalSites - onlineSites
        };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
};

/*
 * Get Clients (Placeholder)
 */
const getClients = async () => {
    // Placeholder - Site Manager API might have a different endpoint for clients
    // /site-manager/v1/sites/{siteId}/clients
    return [];
};

module.exports = {
    getDevices,
    getHealth,
    getSites,
    getClients
};

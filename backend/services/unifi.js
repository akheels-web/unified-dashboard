const axios = require('axios');

// Cloud Configuration
// User provided docs: https://developer.ui.com/site-manager/v1.0.0/gettingstarted
// API Key provided by user
const API_KEY = process.env.UNIFI_API_KEY;
const BASE_URL = process.env.UNIFI_URL || 'https://api.ui.com';

if (!API_KEY) {
    console.warn('WARNING: UNIFI_API_KEY is not set in environment variables.');
}

const unifiClient = axios.create({
    baseURL: BASE_URL,
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
 * Fetch Sites (Really fetching Hosts/Controllers from Site Manager)
 */
const getSites = async () => {
    try {
        console.log('Fetching Unifi Hosts from Cloud...');
        // Documentation says: GET https://api.ui.com/v1/hosts
        const response = await unifiClient.get('/v1/hosts');
        console.log(`[Unifi] Fetched ${response.data.data ? response.data.data.length : 0} hosts.`);
        return response.data;
    } catch (error) {
        console.error('Error fetching Unifi hosts:', error.response?.status, error.response?.data || error.message);
        // console.error('Full Error:', error);
        throw error;
    }
};

/*
 * Fetch Devices (Iterates through hosts)
 */
const getDevices = async () => {
    // Check cache
    if (Date.now() - deviceCache.lastFetch < CACHE_TTL && deviceCache.data.length > 0) {
        return deviceCache.data;
    }

    try {
        // 1. Get Hosts
        const hostsResponse = await getSites();
        // Handle response wrapping if any (e.g. { data: [...] })
        const hostList = Array.isArray(hostsResponse) ? hostsResponse : (hostsResponse.data || []);

        console.log('[Unifi] Host list:', JSON.stringify(hostList.map(h => ({ id: h.id, name: h.name })), null, 2));

        let allDevices = [];

        // 2. Loop hosts to get devices
        for (const host of hostList) {
            try {
                const hostId = host.id;
                console.log(`[Unifi] Fetching devices for host: ${host.name} (${hostId})`);

                // Try to get devices for this host
                // Endpoint guess based on standard REST patterns for this API: /v1/hosts/{id}/devices
                const response = await unifiClient.get(`/v1/hosts/${hostId}/devices`);
                const hostDevices = Array.isArray(response.data) ? response.data : (response.data.data || []);

                // Add host context
                const mappedDevices = hostDevices.map(d => ({
                    ...d,
                    siteName: host.name,
                    siteId: hostId
                }));
                allDevices = allDevices.concat(mappedDevices);
            } catch (err) {
                console.warn(`[Unifi] Failed to fetch devices for host ${host.name} (${host.id}): ${err.message}`);
                // Continue to next host
            }
        }

        deviceCache.data = allDevices;
        deviceCache.lastFetch = Date.now();
        console.log(`[Unifi] Total devices fetched: ${allDevices.length}`);
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

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');

const API_KEY = process.env.UNIFI_API_KEY;

if (!API_KEY) {
    console.error('❌ UNIFI_API_KEY is missing in .env');
    // We don't exit here to avoid crashing the whole backend, but we warn loudly.
}

// Correct Site Manager base URL
// Documentation: https://ui.com/site-manager-api
// Using Early Access (EA) endpoint as standard v1 returned 404
const unifiClient = axios.create({
    baseURL: 'https://api.ui.com/ea/site-manager/v1',
    headers: {
        'X-API-Key': API_KEY, // Primary header for Site Manager API
        'Authorization': `Bearer ${API_KEY}`, // Secondary/Alternative header
        'Accept': 'application/json'
    },
    timeout: 15000
});

// In-memory cache
let deviceCache = {
    data: [],
    lastFetch: 0
};

const CACHE_TTL = 30 * 1000; // 30 seconds

/*
 * Get Hosts (Controllers)
 */
/*
 * Get Hosts (Controllers)
 */
const getHosts = async () => {
    const tryEndpoint = async (endpoint) => {
        try {
            console.log(`[Unifi] Attempting to fetch: ${unifiClient.defaults.baseURL}${endpoint}`);
            const response = await unifiClient.get(endpoint);
            console.log(`[Unifi] Success fetching ${endpoint}`);
            return response.data?.data || [];
        } catch (error) {
            console.error(`[Unifi] Failed to fetch ${endpoint}. Status: ${error.response?.status}`);
            console.error('[Unifi] Full URL attempted:', `${unifiClient.defaults.baseURL}${endpoint}`);
            throw error;
        }
    };

    try {
        // Try /hosts first
        return await tryEndpoint('/hosts');
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('[Unifi] /hosts returned 404, trying /sites as fallback...');
            try {
                // Try /sites as fallback (some API versions differ)
                return await tryEndpoint('/sites');
            } catch (innerError) {
                console.error('[Unifi] Both /hosts and /sites failed.');
                return []; // Return empty array instead of throwing to prevent crash
            }
        }
        console.error('❌ Error fetching hosts:', error.message);
        return []; // Return empty array to prevent dashboard crash
    }
};

/*
 * Get Sites for a Host
 */
const getSitesForHost = async (hostId) => {
    try {
        const response = await unifiClient.get(`/hosts/${hostId}/sites`);
        return response.data?.data || [];
    } catch (error) {
        console.error(`❌ Error fetching sites for host ${hostId}:`,
            error.response?.status,
            error.response?.data || error.message
        );
        return [];
    }
};

/*
 * Get Devices for a Site
 */
const getDevicesForSite = async (siteId) => {
    try {
        const response = await unifiClient.get(`/sites/${siteId}/devices`);
        return response.data?.data || [];
    } catch (error) {
        console.error(`❌ Error fetching devices for site ${siteId}:`,
            error.response?.status,
            error.response?.data || error.message
        );
        return [];
    }
};

/*
 * Get All Devices
 */
const getDevices = async () => {
    // Use cache
    if (Date.now() - deviceCache.lastFetch < CACHE_TTL && deviceCache.data.length > 0) {
        return deviceCache.data;
    }

    try {
        const hosts = await getHosts();
        let allDevices = [];

        for (const host of hosts) {
            const sites = await getSitesForHost(host.id);

            for (const site of sites) {
                const devices = await getDevicesForSite(site.id);

                const mappedDevices = devices.map(device => ({
                    ...device,
                    hostName: host.name,
                    hostId: host.id,
                    siteName: site.name,
                    siteId: site.id,
                    // Map fields for frontend compatibility
                    name: device.name || device.model || 'Unknown',
                    status: (device.status === 'online' || device.state === 1) ? 'online' : 'offline',
                    ipAddress: device.ip,
                    macAddress: device.mac
                }));

                allDevices = allDevices.concat(mappedDevices);
            }
        }

        deviceCache = {
            data: allDevices,
            lastFetch: Date.now()
        };

        return allDevices;

    } catch (error) {
        console.error('❌ Error fetching devices:', error.message);
        return [];
    }
};

/*
 * Health Check
 */
const getHealth = async () => {
    try {
        const hosts = await getHosts();

        const totalHosts = hosts.length;
        const onlineHosts = hosts.filter(h => h.isConnected === true).length;

        // Frontend expects "sites", so we'll map hosts to sites concept for high level stats
        return {
            status: 'ok',
            sites: totalHosts,
            onlineSites: onlineHosts,
            offlineSites: totalHosts - onlineHosts,
            totalHosts,
            onlineHosts
        };

    } catch (error) {
        return {
            status: 'error',
            message: error.message
        };
    }
};

/*
 * Get Clients (optional – may not be available for all accounts)
 */
const getClients = async () => {
    // Placeholder - fetching clients from all sites might be heavy
    // For now returning empty or we could iterate like devices
    return [];
};

/*
 * Proxy for /sites endpoint to maintain compatibility
 */
const getSites = async () => {
    try {
        // Return hosts as "sites" directly or flattened list of actual sites
        const hosts = await getHosts();
        return hosts;
    } catch (e) {
        return [];
    }
};

module.exports = {
    getDevices,
    getHealth,
    getHosts,
    getSites,
    getClients
};

require('dotenv').config();
console.log("DEBUG: BACKEND CODE UPDATED " + new Date().toISOString());

// const pool = require('./db');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from React app (production)
app.use(express.static(path.join(__dirname, '../app/dist')));

// MSAL Configuration
const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
    }
};

const cca = new ConfidentialClientApplication(msalConfig);

// Token Validation Middleware (Simplified)
// In a real app, you would validate the JWT token signature.
const validateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.warn('Missing Authorization header');
        return res.status(401).json({ error: 'No Authorization header provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        console.warn('Missing token in Authorization header');
        return res.status(401).json({ error: 'No token provided' });
    }

    // For debugging: log the first few chars of the token
    console.log('Token received:', token.substring(0, 15) + '...');

    // For now, we trust the client to send a valid token we can use OBO flow with later
    // or just pass it through to Graph.
    req.accessToken = token;
    next();
};

// ============================================================================
// CACHING SYSTEM - Improves Dashboard Performance
// ============================================================================
const cache = {
    dashboardStats: { data: null, timestamp: null },
    licenses: { data: null, timestamp: null },
    deviceDistribution: { data: null, timestamp: null },
    serviceStatus: { data: null, timestamp: null }
};

const CACHE_DURATION = {
    dashboardStats: 5 * 60 * 1000,      // 5 minutes
    licenses: 10 * 60 * 1000,            // 10 minutes (rarely changes)
    deviceDistribution: 10 * 60 * 1000,  // 10 minutes
    serviceStatus: 2 * 60 * 1000         // 2 minutes
};

function getCached(key) {
    const cached = cache[key];
    const duration = CACHE_DURATION[key] || 5 * 60 * 1000;

    if (cached.data && cached.timestamp && (Date.now() - cached.timestamp) < duration) {
        const age = Math.round((Date.now() - cached.timestamp) / 1000);
        console.log(`[Cache] ✓ Serving ${key} from cache (${age}s old)`);
        return cached.data;
    }
    return null;
}

function setCache(key, data) {
    cache[key] = { data, timestamp: Date.now() };
    console.log(`[Cache] ✓ Cached ${key}`);
}

function clearCache(key) {
    if (key) {
        cache[key] = { data: null, timestamp: null };
        console.log(`[Cache] Cleared ${key}`);
    } else {
        // Clear all cache
        Object.keys(cache).forEach(k => {
            cache[k] = { data: null, timestamp: null };
        });
        console.log(`[Cache] Cleared all cache`);
    }
}
// ============================================================================


// Routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// In-memory cache for dropdowns (simple implementation)
const dropdownCache = {
    departments: { data: [], timestamp: 0 },
    locations: { data: [], timestamp: 0 },
    ttl: 1000 * 60 * 60 // 1 hour cache
};

// Helper: Fetch distinct values from Graph with caching
const getCachedValues = async (accessToken, type) => {
    const now = Date.now();
    if (dropdownCache[type].data.length > 0 && (now - dropdownCache[type].timestamp < dropdownCache.ttl)) {
        console.log(`[Cache] Serving ${type} from cache`);
        return dropdownCache[type].data;
    }

    console.log(`[Cache] Miss - Fetching ${type} from Graph...`);
    try {
        const field = type === 'departments' ? 'department' : 'officeLocation';
        // Top 999 to get a good sample size for dropdowns
        const response = await axios.get(`https://graph.microsoft.com/v1.0/users?$top=999&$select=${field}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const distinct = [...new Set(response.data.value.map(u => u[field]).filter(Boolean))].sort();
        dropdownCache[type] = { data: distinct, timestamp: now };
        return distinct;
    } catch (error) {
        console.error(`Failed to fetch ${type}`, error.message);
        return [];
    }
};

// Routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Advanced User Search & Filter (Real Graph Proxy)
// Note: Graph API /users endpoint doesn't support $skip, so we fetch a larger set and do client-side pagination
app.get('/api/users', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Request received for /api/users`);
    try {
        const { page = 1, pageSize = 25, search, department, location, enabled, domain, userType } = req.query;

        // Fetch more records since we can't use $skip (Graph limitation)
        let url = `https://graph.microsoft.com/v1.0/users?$top=999&$count=true`;
        // Select fields we need
        url += '&$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,accountEnabled,createdDateTime,signInActivity,userType';

        // Headers required for advanced queries ($count, $search)
        const headers = {
            Authorization: `Bearer ${req.accessToken}`,
            'Content-Type': 'application/json',
            'ConsistencyLevel': 'eventual'
        };

        const filters = [];

        // 1. Search (DisplayName or Mail)
        if (search) {
            // Note: $search requires "ConsistencyLevel: eventual"
            url += `&$search="displayName:${search}" OR "mail:${search}"`;
        }

        // 2. Filters
        // Escape single quotes in filter values for OData (replace ' with '')
        if (department) filters.push(`department eq '${department.replace(/'/g, "''")}'`);
        if (location) filters.push(`officeLocation eq '${location.replace(/'/g, "''")}'`);
        if (enabled !== undefined && enabled !== 'all') {
            filters.push(`accountEnabled eq ${enabled === 'active'}`);
        }

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        // Domain Filter (Client-side filtering for reliability if Graph limitations hit, but trying server-side first)
        // Note: endsWith on mail requires advanced query.
        if (domain) {
            // Graph API support for endsWith is limited. Using $search might be better for some, but endsWith(mail,...) works with eventual consistency
            filters.push(`endsWith(mail,'${domain}')`);
        }

        if (userType) {
            filters.push(`userType eq '${userType}'`);
        }

        if (filters.length > 0) {
            // Re-construct filter string if we added new filters
            url = url.split('&$filter=')[0] + `&$filter=${filters.join(' and ')}`;
        }

        // 3. Order By (Default to DisplayName)
        url += '&$orderby=displayName';

        console.log(`[Graph Query] ${url}`);

        const response = await axios.get(url, { headers });

        // Server-side pagination on the filtered results
        const allUsers = response.data.value || [];
        const total = allUsers.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + parseInt(pageSize);
        const paginatedUsers = allUsers.slice(startIndex, endIndex);

        res.json({
            value: paginatedUsers,
            '@odata.count': total
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (Users):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch users' });
    }
});

// Get Dropdown Data (Cached)
app.get('/api/users/departments', validateToken, async (req, res) => {
    const data = await getCachedValues(req.accessToken, 'departments');
    res.json(data);
});

app.get('/api/users/locations', validateToken, async (req, res) => {
    const data = await getCachedValues(req.accessToken, 'locations');
    res.json(data);
});

// Bulk Actions: Disable User
app.patch('/api/users/:id', validateToken, async (req, res) => {
    const userId = req.params.id;
    const { accountEnabled } = req.body;

    if (accountEnabled === undefined) return res.status(400).json({ error: 'Missing accountEnabled' });

    console.log(`[${new Date().toISOString()}] ${accountEnabled ? 'Enabling' : 'Disabling'} user ${userId}`);
    try {
        await axios.patch(`https://graph.microsoft.com/v1.0/users/${userId}`,
            { accountEnabled },
            { headers: { Authorization: `Bearer ${req.accessToken}`, 'Content-Type': 'application/json' } }
        );
        res.json({ success: true, message: `User ${accountEnabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
        console.error('Failed to update user status:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// Bulk Actions: Revoke Sessions
app.post('/api/users/:id/revoke', validateToken, async (req, res) => {
    const userId = req.params.id;
});

// Dashboard: Get License Usage (Real Data from M365) - WITH CACHING
app.get('/api/dashboard/licenses', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fetching license data`);

    // Check cache first
    const cached = getCached('licenses');
    if (cached) {
        return res.json(cached);
    }

    try {
        const url = 'https://graph.microsoft.com/v1.0/subscribedSkus';
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        // Exclude free/trial licenses
        const EXCLUDED_SKUS = ['WINDOWS_STORE', 'FLOW_FREE', 'CCIBOTS_PRIVPREV_VIRAL', 'POWERAPPS_VIRAL',
            'POWER_BI_STANDARD', 'Power_Pages_vTrial_for_Makers', 'RIGHTSMANAGEMENT_ADHOC', 'POWERAPPS_DEV'];

        const LICENSE_NAME_MAP = {
            'EXCHANGESTANDARD': 'Exchange Online (Plan 1)', 'EXCHANGEENTERPRISE': 'Exchange Online (Plan 2)',
            'EXCHANGEDESKLESS': 'Exchange Online Kiosk', 'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
            'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium', 'SPB': 'Microsoft 365 Business Premium and Microsoft 365 Copilot',
            'O365_BUSINESS': 'Microsoft 365 Business Standard', 'MICROSOFT_365_COPILOT': 'Microsoft 365 Copilot',
            'SPE_E5': 'Microsoft 365 E5', 'POWER_BI_PRO': 'Power BI Pro', 'VISIOCLIENT': 'Visio Plan 2'
        };

        const licenses = response.data.value
            .filter(sku => !EXCLUDED_SKUS.includes(sku.skuPartNumber))
            .filter(sku => LICENSE_NAME_MAP[sku.skuPartNumber])
            .map(sku => ({
                name: LICENSE_NAME_MAP[sku.skuPartNumber],
                skuPartNumber: sku.skuPartNumber,
                total: sku.prepaidUnits.enabled,
                used: sku.consumedUnits,
                available: sku.prepaidUnits.enabled - sku.consumedUnits,
                percentage: Math.round((sku.consumedUnits / sku.prepaidUnits.enabled) * 100) || 0
            }));

        console.log(`[Licenses] Success - ${licenses.length} license types (filtered from ${response.data.value.length} total)`);

        // Cache the result
        setCache('licenses', licenses);

        res.json(licenses);
    } catch (error) {
        console.error('[Licenses] Error:', error.response?.data || error.message);
        res.json([]);
    }
});

// Dashboard: Get Enhanced Stats (Real Data) - WITH CACHING (NO DEVICES)
app.get('/api/dashboard/stats', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fetching dashboard stats`);

    // Check cache first
    const cached = getCached('dashboardStats');
    if (cached) {
        return res.json(cached);
    }

    try {
        // Only fetch fast endpoints - NO DEVICES (too slow!)
        // Filter users to only active accounts
        const [usersRes, groupsRes, licensesRes] = await Promise.all([
            axios.get('https://graph.microsoft.com/v1.0/users/$count?$filter=accountEnabled eq true and userType eq \'Member\' and (endsWith(userPrincipalName,\'@lxt.ai\') or endsWith(userPrincipalName,\'@clickworker.com\') or endsWith(userPrincipalName,\'@lxt.com\'))', {
                headers: {
                    Authorization: `Bearer ${req.accessToken}`,
                    'ConsistencyLevel': 'eventual'
                }
            }),
            axios.get('https://graph.microsoft.com/v1.0/groups/$count', {
                headers: {
                    Authorization: `Bearer ${req.accessToken}`,
                    'ConsistencyLevel': 'eventual'
                }
            }),
            axios.get('https://graph.microsoft.com/v1.0/subscribedSkus', {
                headers: {
                    Authorization: `Bearer ${req.accessToken}`,
                    'Content-Type': 'application/json',
                }
            })
        ]);

        // Exclude unwanted licenses (same as /api/dashboard/licenses)
        const EXCLUDED_SKUS = [
            'WINDOWS_STORE', 'FLOW_FREE', 'CCIBOTS_PRIVPREV_VIRAL', 'POWERAPPS_VIRAL',
            'POWER_BI_STANDARD', 'Power_Pages_vTrial_for_Makers', 'RIGHTSMANAGEMENT_ADHOC',
            'POWERAPPS_DEV', 'Microsoft_Teams_Rooms_Pro', 'MICROSOFT_BUSINESS_CENTER', 'TEAMS_EXPLORATORY'
        ];

        // Track only specific licenses
        const TRACKED_SKUS = [
            'EXCHANGESTANDARD', 'EXCHANGEENTERPRISE', 'EXCHANGEDESKLESS',
            'O365_BUSINESS_ESSENTIALS', 'O365_BUSINESS_PREMIUM', 'SPB',
            'O365_BUSINESS', 'MICROSOFT_365_COPILOT', 'SPE_E5',
            'POWER_BI_PRO', 'VISIOCLIENT', 'TEAMS_COMMERCIAL'
        ];

        const filteredLicenses = licensesRes.data.value
            .filter(sku => !EXCLUDED_SKUS.includes(sku.skuPartNumber))
            .filter(sku => TRACKED_SKUS.includes(sku.skuPartNumber));
        const totalLicenses = filteredLicenses.reduce((sum, sku) => sum + sku.prepaidUnits.enabled, 0);
        const usedLicenses = filteredLicenses.reduce((sum, sku) => sum + sku.consumedUnits, 0);

        const stats = {
            totalUsers: usersRes.data,
            activeDevices: 0,  // Removed - too slow
            totalGroups: groupsRes.data,
            licensesTotal: totalLicenses,
            licensesUsed: usedLicenses,
            licensesAvailable: totalLicenses - usedLicenses
        };

        console.log(`[Dashboard Stats] Success - ${stats.totalUsers} active users, ${stats.totalGroups} groups, ${stats.licensesTotal} licenses`);

        // Cache the result
        setCache('dashboardStats', stats);

        res.json(stats);
    } catch (error) {
        console.error('[Dashboard Stats] Error:', error.response?.data || error.message);
        res.json({
            totalUsers: 0,
            activeDevices: 0,
            totalGroups: 0,
            licensesTotal: 0,
            licensesUsed: 0,
            licensesAvailable: 0
        });
    }
});

// Bulk Actions: Revoke Sessions
app.post('/api/users/:id/revoke', validateToken, async (req, res) => {
    const userId = req.params.id;
    console.log(`[${new Date().toISOString()}] Revoking sessions for ${userId}`);
    try {
        await axios.post(`https://graph.microsoft.com/v1.0/users/${userId}/revokeSignInSessions`, {},
            { headers: { Authorization: `Bearer ${req.accessToken}`, 'Content-Type': 'application/json' } }
        );
        res.json({ success: true, message: 'Sessions revoked' });
    } catch (error) {
        console.error('Failed to revoke sessions:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to revoke sessions' });
    }
});

// Get Single User Details
app.get('/api/users/:id', validateToken, async (req, res) => {
    const userId = req.params.id;
    console.log(`[${new Date().toISOString()}] Request received for /api/users/${userId}`);
    try {
        const response = await axios.get(`https://graph.microsoft.com/v1.0/users/${userId}?$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,accountEnabled,createdDateTime,givenName,surname,signInActivity`, {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (User ${userId}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch user details' });
    }
});

// Get User Groups (Transitive) - Only Groups with Type Filtering
app.get('/api/users/:id/groups', validateToken, async (req, res) => {
    const userId = req.params.id;
    const groupType = req.query.type || 'all'; // all, security, distribution, m365
    console.log(`[${new Date().toISOString()}] Request received for /api/users/${userId}/groups?type=${groupType}`);
    try {
        // Fetch groups with detailed properties for filtering
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/users/${userId}/transitiveMemberOf/microsoft.graph.group?$select=id,displayName,description,mail,mailEnabled,securityEnabled,groupTypes&$top=999`,
            {
                headers: {
                    Authorization: `Bearer ${req.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let groups = response.data.value;

        // Filter by type if not 'all'
        if (groupType !== 'all') {
            groups = groups.filter(g => {
                // Security groups: securityEnabled=true, mailEnabled=false
                if (groupType === 'security') {
                    return g.securityEnabled && !g.mailEnabled;
                }
                // Distribution lists: mailEnabled=true, securityEnabled=true
                if (groupType === 'distribution') {
                    return g.mailEnabled && g.securityEnabled;
                }
                // M365 groups: groupTypes includes 'Unified'
                if (groupType === 'm365') {
                    return g.groupTypes && g.groupTypes.includes('Unified');
                }
                return true;
            });
        }

        res.json({ value: groups });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (User Groups ${userId}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch user groups' });
    }
});

// ===========================
// Groups Endpoints
// ===========================

// Get All Groups (with optional type filtering)
app.get('/api/groups', validateToken, async (req, res) => {
    const groupType = req.query.type || 'all'; // all, security, distribution, m365
    console.log(`[${new Date().toISOString()}] Request received for /api/groups?type=${groupType}`);
    try {
        // Fetch all groups from the organization
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/groups?$select=id,displayName,description,mail,mailEnabled,securityEnabled,groupTypes,createdDateTime&$top=999`,
            { headers: { Authorization: `Bearer ${req.accessToken}` } }
        );

        let groups = response.data.value;

        // Filter by type if not 'all'
        if (groupType !== 'all') {
            groups = groups.filter(g => {
                // Security groups: securityEnabled=true, mailEnabled=false
                if (groupType === 'security') {
                    return g.securityEnabled && !g.mailEnabled;
                }
                // Distribution lists: mailEnabled=true, securityEnabled=true
                if (groupType === 'distribution') {
                    return g.mailEnabled && g.securityEnabled;
                }
                // M365 groups: groupTypes includes 'Unified'
                if (groupType === 'm365') {
                    return g.groupTypes && g.groupTypes.includes('Unified');
                }
                return true;
            });
        }

        res.json({ value: groups });
    } catch (error) {
        console.error('Failed to fetch groups:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// Get Group Members and Owners
app.get('/api/groups/:id/members', validateToken, async (req, res) => {
    const groupId = req.params.id;
    console.log(`[${new Date().toISOString()}] Request received for /api/groups/${groupId}/members`);
    try {
        // Fetch both members and owners in parallel
        const [membersRes, ownersRes] = await Promise.all([
            axios.get(
                `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id,displayName,mail,userPrincipalName,jobTitle&$top=999`,
                {
                    headers: {
                        Authorization: `Bearer ${req.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            ).catch(err => {
                console.warn('Failed to fetch members:', err.response?.data || err.message);
                return { data: { value: [] } };
            }),
            axios.get(
                `https://graph.microsoft.com/v1.0/groups/${groupId}/owners?$select=id,displayName,mail,userPrincipalName,jobTitle&$top=999`,
                {
                    headers: {
                        Authorization: `Bearer ${req.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            ).catch(err => {
                console.warn('Failed to fetch owners:', err.response?.data || err.message);
                return { data: { value: [] } };
            })
        ]);

        res.json({
            members: membersRes.data.value,
            owners: ownersRes.data.value
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (Group Members ${groupId}):`, error.response?.data || error.message);
        // Return empty arrays to prevent frontend crashes
        res.json({ members: [], owners: [] });
    }
});


// Get User Managed Devices (Intune)
app.get('/api/users/:id/devices', validateToken, async (req, res) => {
    const userId = req.params.id;
    console.log(`[${new Date().toISOString()}] Request received for /api/users/${userId}/devices`);
    try {
        const response = await axios.get(`https://graph.microsoft.com/v1.0/users/${userId}/managedDevices`, {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (User Devices ${userId}):`, error.response?.data || error.message);

        // Handle common error scenarios gracefully
        const status = error.response?.status;

        // Return empty array for:
        // - 404: ResourceNotFound (user has no devices or Intune not configured)
        // - 500: Internal server error from Graph API
        // - 403: Permission issues
        if (status === 404 || status === 500 || status === 403) {
            const reason = status === 404 ? 'User has no managed devices or Intune not configured' :
                status === 403 ? 'Insufficient permissions to access managed devices' :
                    'Graph API internal error when fetching devices';
            console.warn(`${reason}. Returning empty list.`);
            return res.json({ value: [] });
        }

        // For other errors, return empty array to prevent frontend crashes
        console.warn('Unexpected error fetching devices. Returning empty list.');
        res.json({ value: [] });
    }
});

// Get User MFA Status (Authentication Methods)
// Note: Requires UserAuthenticationMethod.Read.All permission
app.get('/api/users/:id/mfa', validateToken, async (req, res) => {
    const userId = req.params.id;
    console.log(`[${new Date().toISOString()}] Request received for /api/users/${userId}/mfa`);
    try {
        // Use beta endpoint for detailed authentication methods
        const response = await axios.get(`https://graph.microsoft.com/beta/users/${userId}/authentication/methods`, {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Filter out password authentication method (everyone has this)
        const methods = response.data.value || [];
        const mfaMethods = methods.filter(m =>
            !m['@odata.type']?.includes('passwordAuthenticationMethod')
        );

        // Return simple boolean
        res.json({ mfaEnabled: mfaMethods.length > 0 });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (User MFA ${userId}):`, error.response?.data || error.message);
        // MFA endpoint might return 403 if permissions are missing
        if (error.response?.status === 403) {
            console.warn('MFA fetch failed due to permissions. Returning false.');
            return res.json({ mfaEnabled: false }); // Graceful fallback
        }
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch MFA status' });
    }
});

// Get Groups
app.get('/api/groups', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Request received for /api/groups`);
    try {
        const response = await axios.get('https://graph.microsoft.com/v1.0/groups?$top=999', {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[${new Date().toISOString()}] Graph API Success: ${response.status} - Fetched ${response.data.value.length} groups`);
        res.json(response.data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (Groups):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch groups' });
    }
});

// Get Intune Managed Devices
app.get('/api/devices', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Request received for /api/devices`);
    try {
        const response = await axios.get('https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$top=999', {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[${new Date().toISOString()}] Graph API Success: ${response.status} - Fetched ${response.data.value.length} devices`);
        res.json(response.data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (Devices):`, error.response?.data || error.message);
        // Intune might return 403 if no license/permissions
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch devices' });
    }
});

// Import Unifi Service (Optional Integration)
const unifiService = require('./services/unifi');
const statusService = require('./services/status');

// Status Route
app.get('/api/status', async (req, res) => {
    try {
        const status = await statusService.getSystemStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch system status' });
    }
});

// Unifi Routes - Only work if configured
app.get('/api/unifi/health', validateToken, async (req, res) => {
    try {
        const data = await unifiService.getHealth();
        res.json(data);
    } catch (error) {
        console.error('Unifi Error:', error.message);
        res.status(502).json({ error: 'Failed to communicate with Unifi Controller', details: error.message });
    }
});

app.get('/api/unifi/clients', validateToken, async (req, res) => {
    try {
        const data = await unifiService.getClients();
        res.json(data);
    } catch (error) {
        console.error('Unifi Error:', error.message);
        res.status(502).json({ error: 'Failed to communicate with Unifi Controller' });
    }
});

app.get('/api/unifi/sites', validateToken, async (req, res) => {
    try {
        const data = await unifiService.getSites();
        res.json(data);
    } catch (error) {
        console.error('Unifi Error:', error.message);
        res.status(502).json({ error: 'Failed to communicate with Unifi Controller' });
    }
});

app.get('/api/unifi/devices', validateToken, async (req, res) => {
    try {
        const data = await unifiService.getDevices();
        res.json({ data });
    } catch (error) {
        console.error('Unifi Error:', error.message);
        res.status(502).json({ error: 'Failed to communicate with Unifi Controller' });
    }
});

const https = require('https');
const fs = require('fs');
// const path = require('path'); // Already imported at the top

// ... (previous code)

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../app/dist', 'index.html'));
});

// Start Server
const startServer = () => {
    const certPath = path.join(__dirname, 'certs', 'cert.pem');
    const keyPath = path.join(__dirname, 'certs', 'key.pem');

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };

        https.createServer(httpsOptions, app).listen(PORT, () => {
            console.log(`Backend server running on https://0.0.0.0:${PORT}`);
            console.log('NOTE: You might need to visit the backend URL in your browser once to accept the self-signed certificate.');
        });
    } else {
        console.warn('SSL certificates not found. Falling back to HTTP. This may cause "Mixed Content" errors.');
        app.listen(PORT, () => {
            console.log(`Backend server running on http://0.0.0.0:${PORT}`);
        });
    }
};

// ======================================================
// JSM WEBHOOK (Onboarding / Offboarding Automation)
// ======================================================

// app.post('/api/jsm/webhook', async (req, res) => {
//     try {
// 
//         const secret = req.headers['x-jsm-secret'];
//         if (secret !== process.env.JSM_WEBHOOK_SECRET) {
//             return res.status(403).json({ error: 'Unauthorized webhook' });
//         }
// 
//         const payload = req.body;
// 
//         if (!payload.issue) {
//             return res.status(400).json({ error: 'Invalid JSM payload' });
//         }
// 
//         const issue = payload.issue;
// 
//         const ticketKey = issue.key;
//         const issueType = issue.fields.issuetype.name;
//         const status = issue.fields.status.name;
//         const reporter = issue.fields.reporter?.displayName || null;
//         const assignee = issue.fields.assignee?.displayName || null;
// 
//         let ticketType = null;
// 
//         if (issueType.toLowerCase().includes('onboarding')) {
//             ticketType = 'onboarding';
//         } else if (issueType.toLowerCase().includes('offboarding')) {
//             ticketType = 'offboarding';
//         } else {
//             return res.status(200).json({ message: 'Not automation ticket' });
//         }
// 
//         const employeeName = issue.fields.summary || null;
//         const department = issue.fields.department || null;
//         const manager = issue.fields.manager || null;
//         const employmentType = issue.fields.employmentType || null;
//         const startDate = issue.fields.startDate || null;
// 
//         const ticketResult = await pool.query(`
//             INSERT INTO jsm_tickets 
//             (ticket_key, ticket_type, status, reporter, assignee, employee_name, department, manager, employment_type, start_date)
//             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
//             ON CONFLICT (ticket_key)
//             DO UPDATE SET 
//                 status = EXCLUDED.status,
//                 assignee = EXCLUDED.assignee,
//                 updated_at = NOW()
//             RETURNING id
//         `, [
//             ticketKey,
//             ticketType,
//             status,
//             reporter,
//             assignee,
//             employeeName,
//             department,
//             manager,
//             employmentType,
//             startDate
//         ]);
// 
//         const ticketId = ticketResult.rows[0].id;
// 
//         const workflowCheck = await pool.query(
//             `SELECT id FROM workflows WHERE ticket_id = $1`,
//             [ticketId]
//         );
// 
//         if (workflowCheck.rows.length === 0) {
//             const workflowInsert = await pool.query(`
//                 INSERT INTO workflows (ticket_id, workflow_type, status)
//                 VALUES ($1, $2, 'pending')
//                 RETURNING id
//             `, [ticketId, ticketType]);
// 
//             const workflowId = workflowInsert.rows[0].id;
// 
//             await createDefaultTasks(workflowId, ticketType);
//         }
// 
//         res.status(200).json({ success: true });
// 
//     } catch (error) {
//         console.error('JSM Webhook Error:', error);
//         res.status(500).json({ error: 'Webhook failed' });
//     }
// });

// ======================================================
// Default Task Creator
// ======================================================

// async function createDefaultTasks(workflowId, type) {
// 
//     let tasks = [];
// 
//     if (type === 'onboarding') {
//         tasks = [
//             'Create M365 Account',
//             'Assign License',
//             'Add to Security Groups',
//             'Create Jira Account',
//             'Assign Device',
//             'Custody Form Signed',
//             'Send Welcome Email'
//         ];
//     }
// 
//     if (type === 'offboarding') {
//         tasks = [
//             'Disable M365 Account',
//             'Revoke Sessions',
//             'Remove MFA',
//             'Remove from Groups',
//             'Collect Device',
//             'Archive Mailbox'
//         ];
//     }
// 
//     for (const task of tasks) {
//         await pool.query(`
//             INSERT INTO workflow_tasks (workflow_id, task_name, status)
//             VALUES ($1, $2, 'pending')
//         `, [workflowId, task]);
//     }
// }

// ======================================================
// List Workflows
// ======================================================

// app.get('/api/workflows', async (req, res) => {
//     try {
//         const result = await pool.query(`
//             SELECT 
//                 w.id,
//                 w.workflow_type,
//                 w.status,
//                 j.ticket_key,
//                 j.employee_name,
//                 j.department,
//                 j.start_date
//             FROM workflows w
//             JOIN jsm_tickets j ON j.id = w.ticket_id
//             ORDER BY w.created_at DESC
//         `);
// 
//         res.json(result.rows);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to fetch workflows' });
//     }
// });

// ======================================================
// List Workflow Tasks
// ======================================================

// app.get('/api/workflows/:id/tasks', async (req, res) => {
//     try {
//         const result = await pool.query(
//             `SELECT * FROM workflow_tasks WHERE workflow_id = $1 ORDER BY id`,
//             [req.params.id]
//         );
//         res.json(result.rows);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to fetch tasks' });
//     }
// });

// ======================================================
// Update Task Status
// ======================================================

// app.patch('/api/tasks/:id', async (req, res) => {
//     try {
//         const { status } = req.body;
// 
//         await pool.query(
//             `UPDATE workflow_tasks SET status = $1, updated_at = NOW() WHERE id = $2`,
//             [status, req.params.id]
//         );
// 
//         res.json({ success: true });
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to update task' });
//     }
// });

startServer();

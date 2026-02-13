const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
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

// Routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// In-memory cache for dropdowns (simple implementation)
const cache = {
    departments: { data: [], timestamp: 0 },
    locations: { data: [], timestamp: 0 },
    ttl: 1000 * 60 * 60 // 1 hour cache
};

// Helper: Fetch distinct values from Graph with caching
const getCachedValues = async (accessToken, type) => {
    const now = Date.now();
    if (cache[type].data.length > 0 && (now - cache[type].timestamp < cache.ttl)) {
        console.log(`[Cache] Serving ${type} from cache`);
        return cache[type].data;
    }

    console.log(`[Cache] Miss - Fetching ${type} from Graph...`);
    try {
        const field = type === 'departments' ? 'department' : 'officeLocation';
        // Top 999 to get a good sample size for dropdowns
        const response = await axios.get(`https://graph.microsoft.com/v1.0/users?$top=999&$select=${field}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const distinct = [...new Set(response.data.value.map(u => u[field]).filter(Boolean))].sort();
        cache[type] = { data: distinct, timestamp: now };
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
        const { page = 1, pageSize = 25, search, department, location, enabled } = req.query;

        // Fetch more records since we can't use $skip (Graph limitation)
        let url = `https://graph.microsoft.com/v1.0/users?$top=999&$count=true`;
        // Select fields we need
        url += '&$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,accountEnabled,createdDateTime,signInActivity';

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
        if (department) filters.push(`department eq '${department}'`);
        if (location) filters.push(`officeLocation eq '${location}'`);
        if (enabled !== undefined && enabled !== 'all') {
            filters.push(`accountEnabled eq ${enabled === 'active'}`);
        }

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
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

// Get User Content (Files/Drives) - Placeholder/Future
// app.get('/api/users/:id/content', ...);

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

startServer();

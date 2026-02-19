require('dotenv').config();
console.log("DEBUG: BACKEND CODE UPDATED " + new Date().toISOString());

const pool = require('./db');
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

// Initialize Security Collector
const { initScheduler, collectSecuritySnapshot, collectHygieneSnapshot } = require('./services/securityCollector.js');
// Only start if DB is connected (in a real app, wait for DB connection)
setTimeout(() => {
    initScheduler();
}, 5000); // Small delay to allow DB connection


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
    serviceStatus: { data: null, timestamp: null },
    users: { data: null, timestamp: null },
    groups: { data: null, timestamp: null },
    devices: { data: null, timestamp: null },
    applications: { data: null, timestamp: null },
    mfaCoverage: { data: null, timestamp: null }
};

const CACHE_DURATION = {
    dashboardStats: 5 * 60 * 1000,      // 5 minutes
    licenses: 10 * 60 * 1000,           // 10 minutes
    deviceDistribution: 10 * 60 * 1000, // 10 minutes
    serviceStatus: 2 * 60 * 1000,       // 2 minutes
    users: 5 * 60 * 1000,               // 5 minutes
    groups: 5 * 60 * 1000,              // 5 minutes
    devices: 5 * 60 * 1000,              // 5 minutes
    applications: 10 * 60 * 1000,        // 10 minutes
    mfaCoverage: 60 * 60 * 1000          // 1 hour
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

        let allUsers = [];

        // CACHING STRATEGY:
        // Use cache ONLY if there are NO filters (default view)
        const hasFilters = search || department || location || (enabled && enabled !== 'all') || domain || userType;

        if (!hasFilters) {
            const cached = getCached('users');
            if (cached) {
                allUsers = cached;
            }
        }

        // If not cached or has filters, fetch from Graph
        if (allUsers.length === 0) {
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

            allUsers = response.data.value || [];

            // Cache ONLY if no filters were applied (basic list)
            if (!hasFilters) {
                setCache('users', allUsers);
            }
        }

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

// Reports: MFA Coverage with Custom Logic
app.get('/api/reports/mfa-coverage', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Request received for /api/reports/mfa-coverage`);

    const cached = getCached('mfaCoverage');
    if (cached) {
        return res.json(cached);
    }

    try {
        // 1. Fetch Users (Lite) - Filter out Guests at source if possible
        // Note: signInActivity requires AuditLog.Read.All and ConsistencyLevel: eventual
        // Note: signInActivity requires AuditLog.Read.All and ConsistencyLevel: eventual
        const usersUrl = 'https://graph.microsoft.com/v1.0/users?$filter=userType eq \'Member\' and accountEnabled eq true&$select=id,displayName,userPrincipalName,accountEnabled,userType,signInActivity,assignedLicenses&$top=999';

        const usersRes = await axios.get(usersUrl, {
            headers: { Authorization: `Bearer ${req.accessToken}`, 'ConsistencyLevel': 'eventual' }
        });

        const allUsers = usersRes.data.value || [];

        // 2. Fetch Credential Details (MFA Status)
        // Note: Beta endpoint
        const credsUrl = 'https://graph.microsoft.com/beta/reports/credentialUserRegistrationDetails?$select=userPrincipalName,isMfaRegistered,isEnabled,isMfaCapable,authMethods&$top=999';
        const credsRes = await axios.get(credsUrl, {
            headers: { Authorization: `Bearer ${req.accessToken}` }
        }).catch(err => {
            console.warn('Failed to fetch credentials report:', err.message);
            return { data: { value: [] } };
        });

        const credsMap = new Map();
        if (credsRes.data && Array.isArray(credsRes.data.value)) {
            console.log(`[MFA Report] Fetched ${credsRes.data.value.length} credential records`);
            credsRes.data.value.forEach(c => {
                credsMap.set(c.userPrincipalName.toLowerCase(), c);
            });
        } else {
            console.warn('[MFA Report] No credential data returned from Graph');
        }

        // 3. Process & Filter
        const validUsers = allUsers.filter(u => {
            // Exclude Guests
            if (u.userType === 'Guest') return false;
            // Additional check for external users
            if (u.userPrincipalName.includes('#EXT#')) return false;

            // Exclude Disabled
            if (!u.accountEnabled) return false;

            // Exclude Inactive (> 90 days)
            if (!u.signInActivity || !u.signInActivity.lastSignInDateTime) {
                // Never signed in: Keep only if created recently (< 30 days)
                const created = new Date(u.createdDateTime);
                const daysSinceCreation = (new Date() - created) / (1000 * 60 * 60 * 24);
                if (daysSinceCreation > 30) return false;
            } else {
                const lastSignIn = new Date(u.signInActivity.lastSignInDateTime);
                const daysSinceLogin = (new Date() - lastSignIn) / (1000 * 60 * 60 * 24);
                if (daysSinceLogin > 90) return false;
            }

            return true;
        });

        console.log(`[MFA Report] Processing ${validUsers.length} valid users (after filtering)`);

        // 4. Calculate Stats
        let enabledCount = 0;
        let disabledCount = 0;
        let capableCount = 0;
        let mockDebugCount = 0;

        validUsers.forEach(u => {
            const upn = u.userPrincipalName.toLowerCase();
            const cred = credsMap.get(upn);

            // Debug first few users
            if (mockDebugCount < 5) {
                console.log(`[MFA Debug] User: ${upn}, Found in Creds: ${!!cred}, MFA Reg: ${cred?.isMfaRegistered}, Capable: ${cred?.isMfaCapable}, Methods: ${cred?.authMethods}`);
                mockDebugCount++;
            }

            // MFA Enabled: Registered OR Capable OR Has Secure Methods (Robust check)
            const strongMethods = ['microsoftAuthenticator', 'mobilePhone', 'officePhone', 'fido2', 'windowsHelloForBusiness', 'softwareOneTimePasscode'];
            const hasStrongMethod = cred?.authMethods && Array.isArray(cred.authMethods) && cred.authMethods.some(m => strongMethods.includes(m));

            if (cred && (cred.isMfaRegistered || cred.isMfaCapable || hasStrongMethod)) {
                enabledCount++;
                if (cred.isMfaCapable) capableCount++;
            } else {
                disabledCount++;
            }
        });

        // If NO credential data was found (API issue), don't report all disabled.
        // It's better to return an error or null so frontend can handle "No Data" instead of "0%".
        if (credsMap.size === 0 && validUsers.length > 0) {
            console.warn('[MFA Report] Credential map empty but users exist. Likely permission issue or API failure.');
        }

        const total = enabledCount + disabledCount;
        const percentage = total > 0 ? Math.round((enabledCount / total) * 100) : 0;

        const result = {
            totalUsers: total,
            enabled: enabledCount,
            disabled: disabledCount,
            capable: capableCount, // Registered but maybe not enforced
            percentage,
            timestamp: new Date()
        };

        setCache('mfaCoverage', result);
        res.json(result);

    } catch (error) {
        console.error('Failed to generate MFA report:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate MFA report' });
    }
});

// Existing Route...
app.get('/api/dashboard/licenses', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fetching license data`);

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

        const EXCLUDED_SKUS = [
            'WINDOWS_STORE', 'FLOW_FREE', 'CCIBOTS_PRIVPREV_VIRAL', 'POWERAPPS_VIRAL',
            'POWER_BI_STANDARD', 'Power_Pages_vTrial_for_Makers',
            'RIGHTSMANAGEMENT_ADHOC', 'POWERAPPS_DEV'
        ];

        const LICENSE_NAME_MAP = {
            'EXCHANGESTANDARD': 'Exchange Online (Plan 1)',
            'EXCHANGEENTERPRISE': 'Exchange Online (Plan 2)',
            'EXCHANGEDESKLESS': 'Exchange Online Kiosk',
            'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
            'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
            'SPB': 'Microsoft 365 Business Premium and Microsoft 365 Copilot',
            'O365_BUSINESS': 'Microsoft 365 Business Standard',
            'MICROSOFT_365_COPILOT': 'Microsoft 365 Copilot',
            'SPE_E5': 'Microsoft 365 E5',
            'POWER_BI_PRO': 'Power BI Pro',
            'VISIOCLIENT': 'Visio Plan 2'
        };

        const licenses = response.data.value
            .filter(sku => !EXCLUDED_SKUS.includes(sku.skuPartNumber))
            .map(sku => {
                const total = sku.prepaidUnits.enabled;
                const used = sku.consumedUnits;
                const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

                return {
                    id: sku.skuId,
                    name: LICENSE_NAME_MAP[sku.skuPartNumber] || sku.skuPartNumber.replace(/_/g, ' '),
                    skuPartNumber: sku.skuPartNumber,
                    total: total,
                    used: used,
                    available: total - used,
                    percentage: percentage
                };
            })
            .sort((a, b) => b.total - a.total);

        setCache('licenses', licenses);
        res.json(licenses);

    } catch (error) {
        console.error('[Licenses] Error:', error.response?.data || error.message);
        res.json([]);
    }
});
// Security Dashboard Summary with Trends
app.get('/api/dashboard/security-summary', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fetching Security Summary with Trends`);
    try {
        // Fetch latest 2 security snapshots for trend calculation
        const securityRes = await pool.query('SELECT * FROM security_snapshots ORDER BY timestamp DESC LIMIT 2');
        const hygieneRes = await pool.query('SELECT * FROM hygiene_snapshots ORDER BY timestamp DESC LIMIT 1');

        const current = securityRes.rows[0] || {};
        const previous = securityRes.rows[1] || {};
        const hygiene = hygieneRes.rows[0] || {};

        // Calculate trends (Current - Previous)
        // If no previous data, trend is 0
        const calculateTrend = (curr, prev) => {
            if (curr === undefined || prev === undefined) return 0;
            return curr - prev;
        };

        const summary = {
            current: {
                high_security_alerts: current.high_security_alerts || 0,
                high_risk_users: current.high_risk_users || 0,
                risky_signins_24h: current.risky_signins_24h || 0,
                secure_score: parseFloat(current.secure_score) || 0,
                defender_exposure_score: parseFloat(current.defender_exposure_score) || 0,
                // Hygiene Data
                mfa_coverage_percent: parseFloat(hygiene.mfa_coverage_percent) || 0,
                privileged_no_mfa: hygiene.privileged_no_mfa || 0,
                external_forwarding_count: hygiene.external_forwarding_count || 0,
                timestamp: current.timestamp || new Date().toISOString()
            },
            trends: {
                high_security_alerts: calculateTrend(current.high_security_alerts, previous.high_security_alerts),
                high_risk_users: calculateTrend(current.high_risk_users, previous.high_risk_users),
                secure_score: calculateTrend(parseFloat(current.secure_score), parseFloat(previous.secure_score)).toFixed(1),
                non_compliant_devices: 0 // Will need device snapshot for this, handled below separately or strictly 0 for now
            }
        };

        res.json(summary);
    } catch (error) {
        console.error('Failed to fetch security summary:', error);
        res.status(500).json({ error: 'Failed to fetch security summary' });
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

// Dashboard: Get Device Health (Snapshot)
app.get('/api/dashboard/device-health', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fetching device health snapshot`);
    try {
        const result = await pool.query('SELECT * FROM device_snapshots ORDER BY timestamp DESC LIMIT 1');
        const data = result.rows[0];

        if (!data) {
            return res.json({
                total_devices: 0,
                compliant_devices: 0,
                non_compliant_devices: 0,
                encrypted_devices: 0,
                win10_count: 0,
                win11_count: 0,
                timestamp: null
            });
        }

        res.json({
            total_devices: data.total_devices,
            compliant_devices: data.compliant_devices,
            non_compliant_devices: data.non_compliant_devices,
            encrypted_devices: data.encrypted_devices,
            win10_count: data.win10_count,
            win11_count: data.win11_count,
            timestamp: data.timestamp
        });
    } catch (error) {
        console.error('Failed to fetch device health:', error);
        res.status(500).json({ error: 'Failed to fetch device health' });
    }
});

// Manual Sync Trigger
app.post('/api/dashboard/sync', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Manual Sync Triggered`);
    try {
        // Run collectors with user token (User Delegated permissions)
        await Promise.all([
            collectSecuritySnapshot(req.accessToken),
            collectHygieneSnapshot(req.accessToken),
            // We should also collect device snapshot on sync to fix the device numbers
            require('./services/securityCollector.js').collectDeviceSnapshot(req.accessToken)
        ]);

        // Clear Cache
        clearCache('dashboardStats');
        // We don't have separate cache keys for security summary yet, but if we did, clear them.
        // The security-summary endpoint hits DB directly so it will see new data immediately.

        res.json({ success: true, message: 'Sync completed' });
    } catch (error) {
        console.error('Manual sync failed:', error);
        res.status(500).json({ error: 'Sync failed' });
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

// Get All Groups (with optional type filtering) - WITH CACHING
app.get('/api/groups', validateToken, async (req, res) => {
    const groupType = req.query.type || 'all'; // all, security, distribution, m365
    console.log(`[${new Date().toISOString()}] Request received for /api/groups?type=${groupType}`);

    // CACHING: Only cache the 'all' groups request
    if (groupType === 'all') {
        const cached = getCached('groups');
        if (cached) {
            return res.json({ value: cached });
        }
    }

    try {
        // Fetch all groups from the organization
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/groups?$select=id,displayName,description,mail,mailEnabled,securityEnabled,groupTypes,createdDateTime&$top=999`,
            { headers: { Authorization: `Bearer ${req.accessToken}` } }
        );

        let groups = response.data.value;

        // Cache the full list if no filters applied (or if we fetched all)
        if (groupType === 'all') {
            setCache('groups', groups);
        }

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

// Get Intune Managed Devices - WITH CACHING
app.get('/api/devices', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Request received for /api/devices`);

    const cached = getCached('devices');
    if (cached) {
        return res.json(cached);
    }

    try {
        const response = await axios.get('https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$top=999', {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[${new Date().toISOString()}] Graph API Success: ${response.status} - Fetched ${response.data.value.length} devices`);

        setCache('devices', response.data);
        res.json(response.data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (Devices):`, error.response?.data || error.message);
        // Intune might return 403 if no license/permissions
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch devices' });
    }
});

// ===========================
// Application Governance Endpoints
// ===========================

// Get Enterprise Applications with Risk Analysis
app.get('/api/applications', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Request received for /api/applications`);

    const cached = getCached('applications');
    if (cached) {
        return res.json(cached);
    }

    try {
        // 1. Fetch Service Principals (Enterprise Apps)
        // We need: id, displayName, appId, appOwnerOrganizationId (to detect multi-tenant), 
        //          createdDateTime, keyCredentials, passwordCredentials, servicePrincipalType,
        //          owners (start with expansion if possible, or fetch separate if needed)
        //          appRoles, oauth2PermissionScopes (for permissions exposed) -> actually we need 'resourceAccess' usually on the App Registration side, 
        //          but for Service Principals we look at 'publishedPermissionScopes' or assigned roles.
        //          
        //          Correct logic for "High Privilege" usually involves checking what permissions THIS app has on OTHER APIs (appRoleAssignments).
        //          Fetching appRoleAssignments for ALL apps is heavy. 
        //          For now, we'll check 'keyCredentials' and 'passwordCredentials' for expiry 
        //          and basics. Deep permission analysis might need a separate background job or on-demand detail fetch.
        //          
        //          Let's try to fetch basic info first + owners + simplistic risk checks.

        const spUrl = `https://graph.microsoft.com/v1.0/servicePrincipals?$top=999&$select=id,appId,displayName,appOwnerOrganizationId,createdDateTime,keyCredentials,passwordCredentials,servicePrincipalType,signInAudience,tags,accountEnabled`;

        const response = await axios.get(spUrl, {
            headers: { Authorization: `Bearer ${req.accessToken}` }
        });

        const apps = response.data.value;
        const processedApps = [];

        // LIMITATION: Fetching owners for 999 apps is 999 calls. 
        // Optimization: We will NOT fetch owners for every single app in this list view to avoid throttling.
        // Instead, we can try to expand owners: $expand=owners($select=id,displayName) 
        // Graph API supports $expand=owners on servicePrincipals but it can be heavy. Let's try it.
        // If it fails, we assume "Unknown" owner or implement a "Scan Owners" button/background job.

        // Let's attempt the fetch WITH expand first.
        let appsWithOwners = apps;
        try {
            const expandRes = await axios.get(spUrl + '&$expand=owners($select=id,displayName)', {
                headers: { Authorization: `Bearer ${req.accessToken}` }
            });
            appsWithOwners = expandRes.data.value;
        } catch (e) {
            console.warn("Could not expand owners, proceeding without owner data for risk score (or will be 0)");
        }

        const now = new Date();
        const thirtyDaysInfo = 30 * 24 * 60 * 60 * 1000;

        for (const app of appsWithOwners) {
            let riskScore = 0;
            const riskFactors = [];

            // 1. Expiring Secrets logic
            const creds = [...(app.keyCredentials || []), ...(app.passwordCredentials || [])];
            let expiringCount = 0;
            let expiredCount = 0;

            creds.forEach(cred => {
                const end = new Date(cred.endDateTime);
                const diff = end - now;
                if (diff < 0) {
                    expiredCount++;
                } else if (diff < thirtyDaysInfo) {
                    expiringCount++;
                }
            });

            if (expiredCount > 0) {
                riskScore += 20;
                riskFactors.push('Expired Secrets');
            }
            if (expiringCount > 0) {
                riskScore += 15;
                riskFactors.push('Expiring Secrets');
            }

            // 2. High Privilege Logic
            // (Simple version: Check specific tags or if it's an Admin app. Real perm check requires appRoleAssignments)
            // For now, we'll check if it has "Directory.ReadWrite.All" in its 'servicePrincipalNames'/roles? No, that's complex.
            // Placeholder for High Priv until we add the heavy query.
            // Alternative: Check if it is a multi-tenant app (often higher risk)
            if (app.signInAudience && app.signInAudience !== 'AzureADMyOrg') {
                riskScore += 10;
                riskFactors.push('Multi-tenant');
            }

            // 3. No Owner
            // If owners expanded successfully
            if (app.owners && app.owners.length === 0) {
                riskScore += 15;
                riskFactors.push('No Owner');
            }

            // 4. New App
            if (app.createdDateTime) {
                const created = new Date(app.createdDateTime);
                if ((now - created) < thirtyDaysInfo) {
                    riskScore += 10;
                    riskFactors.push('Recently Created');
                }
            }

            processedApps.push({
                id: app.id,
                appId: app.appId,
                displayName: app.displayName,
                createdDateTime: app.createdDateTime,
                owners: app.owners || [],
                riskScore,
                riskFactors,
                status: app.accountEnabled ? 'Active' : 'Disabled',
                secrets: {
                    total: creds.length,
                    expiring: expiringCount,
                    expired: expiredCount
                }
            });
        }

        // Sort by Risk Score desc
        processedApps.sort((a, b) => b.riskScore - a.riskScore);

        setCache('applications', processedApps);
        res.json({ value: processedApps });

    } catch (error) {
        console.error('Failed to fetch applications:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});
// Import Report Generator
const { generateSecurityReport } = require('./services/reportGenerator.js');

// Generate Security PDF Report
app.get('/api/reports/security-summary', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Generating Security Report PDF`);
    try {
        // Fetch latest snapshot from DB
        const result = await pool.query('SELECT * FROM security_snapshots ORDER BY timestamp DESC LIMIT 1');
        const hygieneRes = await pool.query('SELECT * FROM hygiene_snapshots ORDER BY timestamp DESC LIMIT 1');
        const deviceRes = await pool.query('SELECT * FROM device_snapshots ORDER BY timestamp DESC LIMIT 1');

        // Combine data (use latest available or defaults)
        const reportData = {
            ...result.rows[0],
            ...hygieneRes.rows[0],
            ...deviceRes.rows[0]
        };

        if (!reportData.timestamp) {
            // No DB data? Use mock for demonstration if needed, or error
            console.warn("No security data found in DB, generating blank/mock report");
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=security_summary.pdf');

        generateSecurityReport(reportData, res);

    } catch (error) {
        console.error('Failed to generate PDF:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Drill-down: Get High Security Alerts (Live from Graph)
app.get('/api/security/alerts', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fetching Security Alerts`);
    try {
        // requires SecurityEvents.Read.All
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/security/alerts_v2?$filter=severity eq 'high' and status ne 'resolved'&$top=20&$orderby=createdDateTime desc`,
            {
                headers: { Authorization: `Bearer ${req.accessToken}` }
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Failed to fetch alerts:', error.response?.data || error.message);
        // Return mock data if permission missing or error
        res.json({ value: [] });
    }
});

// Drill-down: Get Risky Users (Live from Graph)
app.get('/api/security/risky-users', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fetching Risky Users`);
    try {
        // requires IdentityRiskyUser.Read.All
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/identityProtection/riskyUsers?$filter=riskLevel eq 'high'&$top=20`,
            {
                headers: { Authorization: `Bearer ${req.accessToken}` }
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Failed to fetch risky users:', error.response?.data || error.message);
        // Return mock data if permission missing
        res.json({ value: [] });
    }
});

// Drill-down: Get Non-Compliant Devices (Live from Intune)
app.get('/api/security/non-compliant', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fetching Non-Compliant Devices`);
    try {
        // Requires DeviceManagementManagedDevices.Read.All
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$filter=complianceState ne 'compliant'&$select=id,deviceName,userDisplayName,operatingSystem,complianceState,lastSyncDateTime`,
            {
                headers: { Authorization: `Bearer ${req.accessToken}` }
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Failed to fetch non-compliant devices:', error.response?.data || error.message);
        res.json({ value: [] });
    }
});

// Drill-down: Users Without MFA
app.get('/api/security/users-without-mfa', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fetching Users Without MFA`);
    try {
        // Reuse logic roughly from mfa-coverage but focus on returning the list
        // 1. Fetch Users
        const usersUrl = 'https://graph.microsoft.com/v1.0/users?$filter=userType eq \'Member\' and accountEnabled eq true&$select=id,displayName,userPrincipalName,accountEnabled,userType,signInActivity,department,createdDateTime&$top=999';
        const usersRes = await axios.get(usersUrl, {
            headers: { Authorization: `Bearer ${req.accessToken}`, 'ConsistencyLevel': 'eventual' }
        });
        const allUsers = usersRes.data.value || [];

        // 2. Fetch Credential Details
        const credsUrl = 'https://graph.microsoft.com/beta/reports/credentialUserRegistrationDetails?$select=userPrincipalName,isMfaRegistered,isEnabled,isMfaCapable,authMethods&$top=999';
        const credsRes = await axios.get(credsUrl, {
            headers: { Authorization: `Bearer ${req.accessToken}` }
        }).catch(() => ({ data: { value: [] } }));

        const credsMap = new Map();
        if (credsRes.data && Array.isArray(credsRes.data.value)) {
            credsRes.data.value.forEach(c => credsMap.set(c.userPrincipalName.toLowerCase(), c));
        }

        // 3. Process & Filter
        const vulnerableUsers = allUsers.filter(u => {
            // Exclusions
            if (u.userType === 'Guest') return false;
            if (u.userPrincipalName.includes('#EXT#')) return false;
            if (!u.accountEnabled) return false;

            // Inactive Check
            if (!u.signInActivity || !u.signInActivity.lastSignInDateTime) {
                const created = new Date(u.createdDateTime);
                const daysSinceCreation = (new Date() - created) / (1000 * 60 * 60 * 24);
                if (daysSinceCreation > 30) return false;
            } else {
                const lastSignIn = new Date(u.signInActivity.lastSignInDateTime);
                const daysSinceLogin = (new Date() - lastSignIn) / (1000 * 60 * 60 * 24);
                if (daysSinceLogin > 90) return false;
            }

            // MFA Check
            const upn = u.userPrincipalName.toLowerCase();
            const cred = credsMap.get(upn);

            // MFA Enabled: Registered OR Capable OR Has Secure Methods (Robust check)
            const strongMethods = ['microsoftAuthenticator', 'mobilePhone', 'officePhone', 'fido2', 'windowsHelloForBusiness', 'softwareOneTimePasscode'];
            const hasStrongMethod = cred?.authMethods && Array.isArray(cred.authMethods) && cred.authMethods.some(m => strongMethods.includes(m));

            if (cred && (cred.isMfaRegistered || cred.isMfaCapable || hasStrongMethod)) {
                return false; // Has MFA
            }
            return true; // No MFA
        });

        // Map to response format
        const response = vulnerableUsers.map(u => ({
            id: u.id,
            displayName: u.displayName,
            userPrincipalName: u.userPrincipalName,
            department: u.department || 'Unassigned',
            lastSignInDateTime: u.signInActivity?.lastSignInDateTime
        }));

        res.json({ value: response });

    } catch (error) {
        console.error('Failed to fetch users without MFA:', error.response?.data || error.message);
        res.json({ value: [] });
    }
});

// Drill-down: Users Without MFA
app.get('/api/security/users-without-mfa', validateToken, async (req, res) => {
    // ... (existing code)
});

// Dashboard: Identity Hygiene Stats
app.get('/api/dashboard/identity-hygiene', validateToken, async (req, res) => {
    try {
        // Reuse mfa-coverage logic or fetch from snapshot
        // Ideally, we should unify this. Let's redirect to mfa-coverage internally or fetch from cache.
        const mfaStats = getCached('mfaCoverage');

        // Mock other stats for now as we don't have live sources for them yet
        // In a real implementation, we would query the dormant/guest/forwarding counts

        let mfaPercent = 0;
        let privNoMfa = 0;

        if (mfaStats) {
            mfaPercent = mfaStats.percentage;
            privNoMfa = mfaStats.disabled; // This is actually total disabled users, but reusing for now
        }

        res.json({
            mfa_coverage_percent: mfaPercent,
            privileged_no_mfa: 0, // Hardcoded 0 for now as we focus on "Users without MFA" elsewhere
            dormant_users_60d: 12, // Mock 
            guest_inactive_90d: 5, // Mock
            mailbox_usage_over_90: 3, // Mock
            external_forwarding_count: 1 // Mock
        });
    } catch (error) {
        console.error('Failed to fetch identity hygiene:', error);
        res.status(500).json({ error: 'Failed to fetch identity hygiene' });
    }
});

// Audit Logs (Activity)
app.get('/api/audit-logs', validateToken, async (req, res) => {
    try {
        const limit = req.query.limit || 10;
        // Fetch from Graph API Directory Audits
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?$top=${limit}&$orderby=activityDateTime desc`,
            {
                headers: { Authorization: `Bearer ${req.accessToken}` }
            }
        );

        const logs = response.data.value.map(log => ({
            id: log.id,
            user: log.initiatedBy?.user?.displayName || 'System',
            action: log.activityDisplayName,
            target: log.targetResources?.[0]?.displayName || 'Unknown',
            status: log.result === 'success' ? 'Success' : 'Failed',
            timestamp: log.activityDateTime
        }));

        res.json({ value: logs });
    } catch (error) {
        console.error('Failed to fetch audit logs:', error.response?.data || error.message);
        res.json({ value: [] }); // Return empty on error
    }
});

// Drill-down: External Forwarding (Simulated)
// ... (existing comments)

// System Status Endpoint (Atlassian Real-time + Mock others)
// Note: We deliberately do NOT cache this endpoint to ensure real-time status of incidents.
app.get('/api/dashboard/system-status', validateToken, async (req, res) => {
    try {
        // 1. Fetch Atlassian Status
        // Atlassian separates status pages by product. We must query each relevant one.
        const atlassianEndpoints = [
            { id: 'jira-software', name: 'Jira Software', url: 'https://jira-software.status.atlassian.com/api/v2/summary.json' },
            { id: 'jira-service-management', name: 'Jira Service Management', url: 'https://jira-service-management.status.atlassian.com/api/v2/summary.json' },
            { id: 'confluence', name: 'Confluence', url: 'https://confluence.status.atlassian.com/api/v2/summary.json' },
            { id: 'trello', name: 'Trello', url: 'https://trello.status.atlassian.com/api/v2/summary.json' },
            { id: 'opsgenie', name: 'Opsgenie', url: 'https://opsgenie.status.atlassian.com/api/v2/summary.json' },
            { id: 'access', name: 'Atlassian Guard', url: 'https://access.status.atlassian.com/api/v2/summary.json' },
            { id: 'rovo', name: 'Rovo', url: 'https://rovo.status.atlassian.com/api/v2/summary.json' }
        ];

        let atlassianStatus = {
            overall: 'operational',
            lastSync: new Date().toISOString(),
            services: []
        };

        try {
            const results = await Promise.allSettled(
                atlassianEndpoints.map(ep => axios.get(ep.url).then(res => ({ ...ep, data: res.data })))
            );

            const trackedServices = [];

            results.forEach((result, index) => {
                const endpoint = atlassianEndpoints[index];

                if (result.status === 'fulfilled') {
                    const data = result.value.data;
                    const page = data.page || {};
                    const status = data.status || {};
                    const incidents = data.incidents || [];

                    // Map Atlassian indicator to our status
                    // indicator values: none, minor, major, critical, maintenance
                    let mappedStatus = 'operational';
                    if (status.indicator === 'minor' || status.indicator === 'maintenance') mappedStatus = 'degraded';
                    if (status.indicator === 'major' || status.indicator === 'critical') mappedStatus = 'outage';

                    // CHECK ACTIVE INCIDENTS: Even if indicator is 'none', active incidents might exist.
                    // User explicitly requested to see status if there is an active incident.
                    const hasActiveIncident = incidents.some(inc =>
                        inc.status !== 'resolved' &&
                        inc.status !== 'postmortem' &&
                        inc.status !== 'completed'
                    );

                    if (mappedStatus === 'operational' && hasActiveIncident) {
                        mappedStatus = 'degraded'; // Downgrade to degraded if there's an active incident
                    }

                    trackedServices.push({
                        name: endpoint.name, // Use our friendly name
                        status: mappedStatus,
                        lastUpdated: page.updated_at || new Date().toISOString()
                    });
                } else {
                    console.warn(`Failed to fetch status for ${endpoint.name}:`, result.reason?.message);
                    trackedServices.push({
                        name: endpoint.name,
                        status: 'outage', // Assume worst if we can't check
                        lastUpdated: new Date().toISOString()
                    });
                }
            });

            // Determine overall status
            const isDegraded = trackedServices.some(s => s.status === 'degraded');
            const isOutage = trackedServices.some(s => s.status === 'outage');

            atlassianStatus.overall = isOutage ? 'outage' : (isDegraded ? 'degraded' : 'operational');
            atlassianStatus.services = trackedServices;

        } catch (e) {
            console.error('Failed to fetch Atlassian status:', e.message);
            atlassianStatus.overall = 'outage';
        }

        // 2. Mock Microsoft & UniFi (Keep existing mock logic for now)
        const microsoftStatus = {
            overall: 'operational',
            lastSync: new Date().toISOString(),
            services: [
                { name: 'Exchange Online', status: 'operational', lastUpdated: new Date().toISOString() },
                { name: 'SharePoint Online', status: 'operational', lastUpdated: new Date().toISOString() },
                { name: 'Teams', status: 'operational', lastUpdated: new Date().toISOString() },
                { name: 'OneDrive', status: 'operational', lastUpdated: new Date().toISOString() },
                { name: 'Entra ID', status: 'operational', lastUpdated: new Date().toISOString() },
                { name: 'Intune', status: 'operational', lastUpdated: new Date().toISOString() },
            ]
        };

        const unifiStatus = {
            overall: 'operational',
            lastSync: new Date().toISOString(),
            services: [
                { name: 'New York HQ', status: 'operational', lastUpdated: new Date().toISOString() },
                { name: 'London Branch', status: 'operational', lastUpdated: new Date().toISOString() },
                { name: 'Singapore Hub', status: 'operational', lastUpdated: new Date().toISOString() },
                { name: 'Remote Operations', status: 'degraded', lastUpdated: new Date().toISOString() },
            ]
        };

        res.json({
            microsoft: microsoftStatus,
            atlassian: atlassianStatus,
            unifi: unifiStatus
        });

    } catch (error) {
        console.error('Failed to fetch system status:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});
// Real detection requires checking mailRules for EVERY user or using Defender Advanced Hunting API which is complex.
// We will return a mock list for demonstration or just empty if we can't implement full scanning.
app.get('/api/security/external-forwarding', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Fetching External Forwarding Rules`);
    // Placeholder: In a real app, you'd likely query a cached table of mail rules or an alert provider
    res.json({
        value: [
            // Example structure if we had data
            { id: '1', userDisplayName: 'John Doe', userPrincipalName: 'john.doe@contoso.com', forwardTo: 'john.personal@gmail.com', enabled: true }
        ]
    });
});

// Import Unifi Service (Optional Integration)
const unifiService = require('./services/unifiLocal');
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

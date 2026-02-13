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

// Proxy to Microsoft Graph (Example: Get Users)
app.get('/api/users', validateToken, async (req, res) => {
    console.log(`[${new Date().toISOString()}] Request received for /api/users`);
    try {
        // Fetch top 999 users to solve sync issue for small/medium tenants
        const response = await axios.get('https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,accountEnabled,createdDateTime,lastSignInDateTime', {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[${new Date().toISOString()}] Graph API Success: ${response.status} - Fetched ${response.data.value.length} users`);
        res.json(response.data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (Users):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch users' });
    }
});

// Get Single User Details
app.get('/api/users/:id', validateToken, async (req, res) => {
    const userId = req.params.id;
    console.log(`[${new Date().toISOString()}] Request received for /api/users/${userId}`);
    try {
        const response = await axios.get(`https://graph.microsoft.com/v1.0/users/${userId}?$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,accountEnabled,createdDateTime,lastSignInDateTime`, {
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

// Get User Groups (Transitive)
app.get('/api/users/:id/groups', validateToken, async (req, res) => {
    const userId = req.params.id;
    console.log(`[${new Date().toISOString()}] Request received for /api/users/${userId}/groups`);
    try {
        const response = await axios.get(`https://graph.microsoft.com/v1.0/users/${userId}/transitiveMemberOf?$top=999`, {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (User Groups ${userId}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch user groups' });
    }
});

// Get User MFA Status (Authentication Methods)
// Note: Requires UserAuthenticationMethod.Read.All permission
app.get('/api/users/:id/mfa', validateToken, async (req, res) => {
    const userId = req.params.id;
    console.log(`[${new Date().toISOString()}] Request received for /api/users/${userId}/mfa`);
    try {
        const response = await axios.get(`https://graph.microsoft.com/v1.0/users/${userId}/authentication/methods`, {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Graph API Error (User MFA ${userId}):`, error.response?.data || error.message);
        // MFA endpoint might return 403 if permissions are missing
        if (error.response?.status === 403) {
            console.warn('MFA fetch failed due to permissions. Returning empty list.');
            return res.json({ value: [] }); // Graceful fallback
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

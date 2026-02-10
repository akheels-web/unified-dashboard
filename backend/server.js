require('dotenv').config();
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
        const response = await axios.get('https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,accountEnabled', {
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

// Start Server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

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
        return res.status(401).json({ error: 'No Authorization header provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
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
    try {
        const response = await axios.get('https://graph.microsoft.com/v1.0/users', {
            headers: {
                Authorization: `Bearer ${req.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching users:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: 'Failed to fetch users from Graph API' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

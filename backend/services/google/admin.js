const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

/**
 * Initializes the Google Auth Client using Domain-Wide Delegation
 */
const getAuthClient = () => {
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH || path.join(__dirname, '../../config/gcp-service-account.json');
    const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL;

    if (!fs.existsSync(keyPath)) {
        console.warn(`[Google Workspace] Note: Service account JSON not found at ${keyPath}. Google integration is disabled.`);
        return null;
    }

    if (!adminEmail) {
        console.warn('[Google Workspace] GOOGLE_WORKSPACE_ADMIN_EMAIL is not set in .env. Google integration is disabled.');
        return null;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: [
            'https://www.googleapis.com/auth/admin.directory.user.readonly',
            'https://www.googleapis.com/auth/admin.directory.group.readonly',
            'https://www.googleapis.com/auth/apps.licensing'
        ],
        clientOptions: {
            subject: adminEmail
        }
    });

    return auth;
};

/**
 * Fetches all Google Workspace users with their org units and last login time
 */
const getGoogleUsers = async (limit = 100) => {
    const auth = getAuthClient();
    if (!auth) return [];

    const admin = google.admin({ version: 'directory_v1', auth });

    try {
        const response = await admin.users.list({
            customer: 'my_customer',
            maxResults: limit,
            orderBy: 'email',
            projection: 'full' // to get orgUnitPath, suspended status, creationTime
        });

        return response.data.users || [];
    } catch (error) {
        console.error('[Google Workspace] Error fetching users:', error?.message);
        throw new Error('Failed to fetch Google Workspace users');
    }
};

/**
 * Fetches groups a specific user belongs to
 */
const getUserGroups = async (userEmail) => {
    const auth = getAuthClient();
    if (!auth) return [];

    const admin = google.admin({ version: 'directory_v1', auth });

    try {
        const response = await admin.groups.list({
            userKey: userEmail
        });

        return response.data.groups || [];
    } catch (error) {
        console.error(`[Google Workspace] Error fetching config for ${userEmail}:`, error?.message);
        return [];
    }
};

/**
 * Fetches licenses for a specific user
 * Product ID "Google-Apps" typically refers to Workspace
 */
const getUserLicenses = async (userEmail) => {
    const auth = getAuthClient();
    if (!auth) return [];

    const licensing = google.licensing({ version: 'v1', auth });

    try {
        // Fetch standard Workspace licenses
        const response = await licensing.licenseAssignments.listForProduct({
            productId: 'Google-Apps',
            customerId: 'my_customer',
        });

        // Filter the license list for just this user (the API lacks a 'list for user' endpoint, 
        // it requires scanning the product list and finding the user)
        const assignments = response.data.items || [];
        return assignments.filter(item => item.userId === userEmail);
    } catch (error) {
        console.error(`[Google Workspace] Error fetching licenses for ${userEmail}:`, error?.message);
        return [];
    }
};

module.exports = {
    getGoogleUsers,
    getUserGroups,
    getUserLicenses
};

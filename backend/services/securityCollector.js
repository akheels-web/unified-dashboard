const axios = require('axios');
const cron = require('node-cron');
const pool = require('../db');

// ============================================================================
// SECURITY COLLECTOR SERVICE
// Fetches data from Microsoft Graph and stores snapshots in PostgreSQL
// ============================================================================

const COLLECTOR_INTERVALS = {
    HIGH_FREQUENCY: '0 */2 * * *', // Every 2 hours (0:00, 2:00, etc.)
    DEVICE_HEALTH: '0 */4 * * *',  // Every 4 hours
    DAILY: '0 6 * * *'             // Daily at 6:00 AM
};

// Helper: Get App-Only Token (Client Credentials Flow)
async function getAppToken() {
    try {
        const params = new URLSearchParams();
        params.append('client_id', process.env.AZURE_CLIENT_ID);
        params.append('scope', 'https://graph.microsoft.com/.default');
        params.append('client_secret', process.env.AZURE_CLIENT_SECRET);
        params.append('grant_type', 'client_credentials');

        const response = await axios.post(
            `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
            params
        );
        return response.data.access_token;
    } catch (error) {
        console.error('[Collector] Failed to get App Token:', error.response?.data || error.message);
        throw error;
    }
}

// 1. Collect Security Snapshots (High Frequency)
async function collectSecuritySnapshot() {
    console.log('[Collector] Starting Security Snapshot...');
    try {
        const token = await getAppToken();
        const headers = { Authorization: `Bearer ${token}` };

        // A. Defender Alerts (High Severity, Unresolved)
        // Requires SecurityEvents.Read.All
        const alertsRes = await axios.get(
            `https://graph.microsoft.com/v1.0/security/alerts_v2?$filter=severity eq 'high' and status ne 'resolved'&$count=true`,
            { headers: { ...headers, 'ConsistencyLevel': 'eventual' } }
        ).catch(e => {
            console.error('[Collector] Failed to fetch alerts:', e.response?.data || e.message);
            return { data: { '@odata.count': 0 } };
        });

        // B. Risky Users (High Risk)
        // Requires IdentityRiskyUser.Read.All
        const riskyUsersRes = await axios.get(
            `https://graph.microsoft.com/v1.0/identityProtection/riskyUsers?$filter=riskLevel eq 'high'&$count=true`,
            { headers: { ...headers, 'ConsistencyLevel': 'eventual' } }
        ).catch(e => {
            console.error('[Collector] Failed to fetch risky users:', e.response?.data || e.message);
            return { data: { '@odata.count': 0 } };
        });

        // C. Secure Score (Most Recent)
        // Requires SecurityActions.Read.All
        const secureScoreRes = await axios.get(
            `https://graph.microsoft.com/v1.0/security/secureScores?$top=1`,
            { headers }
        ).catch(e => {
            console.error('[Collector] Failed to fetch secure score:', e.response?.data || e.message);
            return { data: { value: [] } };
        });

        const secureScore = secureScoreRes.data.value?.[0]?.currentScore || 0;
        const maxScore = secureScoreRes.data.value?.[0]?.maxScore || 100;
        // Calculate Exposure Score (Inverse of Secure Score % roughly, or mock if not direct)
        // Microsoft doesn't give direct "Exposure Score" via API easily, usually it's mainly Secure Score.
        // We will calc it as 100 - (percentage).
        const securePercent = maxScore > 0 ? (secureScore / maxScore) * 100 : 0;
        const exposureScore = Math.max(0, 100 - securePercent).toFixed(2);

        // D. Risky Sign-ins (High Risk, Last 24h)
        // Requires AuditLog.Read.All or IdentityRiskySignin.Read.All
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const riskySigninsRes = await axios.get(
            `https://graph.microsoft.com/v1.0/identityProtection/riskyServicePrincipals?$filter=riskLevel eq 'high' and riskLastUpdatedDateTime ge ${oneDayAgo}&$count=true`,
            { headers }
        ).catch(() => ({ data: { '@odata.count': 0 } })); // Fallback

        // Insert into DB
        await pool.query(`
            INSERT INTO security_snapshots 
            (high_security_alerts, high_risk_users, secure_score, defender_exposure_score, risky_signins_24h, timestamp)
            VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
            alertsRes.data['@odata.count'] || 0,
            riskyUsersRes.data['@odata.count'] || 0,
            secureScore,
            exposureScore,
            riskySigninsRes.data['@odata.count'] || 0
        ]);

        console.log('[Collector] ✅ Security Snapshot Saved');

    } catch (error) {
        console.error('[Collector] Security Snapshot Failed:', error.message);
    }
}

// 2. Collect Device Health (Every 4 Hours) - Unchanged for now, seems okay
async function collectDeviceSnapshot() {
    console.log('[Collector] Starting Device Snapshot...');
    try {
        const token = await getAppToken();
        const headers = { Authorization: `Bearer ${token}` };

        // Requires DeviceManagementManagedDevices.Read.All
        const devicesRes = await axios.get(
            `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$select=id,complianceState,operatingSystem,osVersion,isEncrypted`,
            { headers }
        ).catch(e => ({ data: { value: [] } }));

        const devices = devicesRes.data.value || [];
        const total = devices.length;
        const nonCompliant = devices.filter(d => d.complianceState !== 'compliant').length;
        const encrypted = devices.filter(d => d.isEncrypted === true).length;
        const win10 = devices.filter(d => d.operatingSystem === 'Windows' && d.osVersion?.startsWith('10.0.1')).length;
        const win11 = devices.filter(d => d.operatingSystem === 'Windows' && d.osVersion?.startsWith('10.0.2')).length;

        await pool.query(`
            INSERT INTO device_snapshots 
            (total_devices, compliant_devices, non_compliant_devices, encrypted_devices, win10_count, win11_count, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [total, total - nonCompliant, nonCompliant, encrypted, win10, win11]);

        console.log('[Collector] ✅ Device Snapshot Saved');

    } catch (error) {
        console.error('[Collector] Device Snapshot Failed:', error.message);
    }
}

// 3. Collect Identity Hygiene (Daily)
async function collectHygieneSnapshot() {
    console.log('[Collector] Starting Hygiene Snapshot...');
    try {
        const token = await getAppToken();
        const headers = { Authorization: `Bearer ${token}` };

        // A. MFA Coverage & Privileged Users
        const credentialRes = await axios.get(
            `https://graph.microsoft.com/beta/reports/credentialUserRegistrationDetails?$select=userPrincipalName,isMfaRegistered,authMethods`,
            { headers }
        ).catch(e => ({ data: { value: [] } }));

        const users = credentialRes.data.value || [];
        const totalUsers = users.length;
        const mfaRegistered = users.filter(u => u.isMfaRegistered).length;
        const mfaPercent = totalUsers > 0 ? ((mfaRegistered / totalUsers) * 100).toFixed(2) : 0;

        // Fetch Privileged Roles (Global Admin) to check their MFA
        // Requires RoleManagement.Read.Directory
        const adminsRes = await axios.get(
            `https://graph.microsoft.com/v1.0/directoryRoles?$filter=roleTemplateId eq '62e90394-69f5-4237-9190-012177145e10'&$expand=members`,
            { headers }
        ).catch(() => ({ data: { value: [] } }));

        const globalAdmins = adminsRes.data.value?.[0]?.members || [];
        const privilegedNoMfa = globalAdmins.filter(admin => {
            const user = users.find(u => u.userPrincipalName === admin.userPrincipalName);
            return user && !user.isMfaRegistered;
        }).length;

        // B. Dormant Users (>60d)
        // Fetch users with signInActivity
        const usersActivityRes = await axios.get(
            `https://graph.microsoft.com/v1.0/users?$select=id,signInActivity,userPrincipalName&$top=999`,
            { headers }
        ).catch(() => ({ data: { value: [] } }));

        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const dormantUsers = usersActivityRes.data.value.filter(u => {
            if (!u.signInActivity?.lastSignInDateTime) return false; // Never signed in or no permission to see
            return new Date(u.signInActivity.lastSignInDateTime) < sixtyDaysAgo;
        }).length;

        // C. External Forwarding (Mocked heavily as getting mail rules for ALL users is expensive/restricted)
        // We will assume 0 or 1 for now if we can't easily get it without high privs
        const externalForwarding = 0;

        await pool.query(`
            INSERT INTO hygiene_snapshots 
            (mfa_coverage_percent, privileged_no_mfa, dormant_users_60d, external_forwarding_count, timestamp)
            VALUES ($1, $2, $3, $4, NOW())
        `, [mfaPercent, privilegedNoMfa, dormantUsers, externalForwarding]);

        console.log('[Collector] ✅ Hygiene Snapshot Saved');

    } catch (error) {
        console.error('[Collector] Hygiene Snapshot Failed:', error.message);
    }
}

// Initialize Scheduler
function initScheduler() {
    console.log('[Collector] Initializing Background Jobs...');

    // Schedule Jobs
    cron.schedule(COLLECTOR_INTERVALS.HIGH_FREQUENCY, collectSecuritySnapshot);
    cron.schedule(COLLECTOR_INTERVALS.DEVICE_HEALTH, collectDeviceSnapshot);
    cron.schedule(COLLECTOR_INTERVALS.DAILY, collectHygieneSnapshot);

    // Run once on startup (dev only - remove in prod if strict)
    console.log('[Collector] Running initial collection...');
    collectSecuritySnapshot();
    collectDeviceSnapshot();
    collectHygieneSnapshot();
}

module.exports = {
    initScheduler,
    collectSecuritySnapshot,
    collectHygieneSnapshot
};

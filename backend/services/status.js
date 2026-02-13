const axios = require('axios');

// Status Page URLs
const MICROSOFT_STATUS_URL = 'https://status.cloud.microsoft';
const UNIFI_STATUS_API = 'https://status.ui.com/api/v2/summary.json';

const getMicrosoftStatus = async () => {
    try {
        // Mocking individual services state for now as specific API is complex
        return {
            overall: 'operational',
            lastSync: new Date(),
            services: [
                { name: 'Exchange Online', status: 'operational' },
                { name: 'SharePoint Online', status: 'operational' },
                { name: 'Teams', status: 'operational' },
                { name: 'OneDrive', status: 'operational' },
                { name: 'Entra ID', status: 'operational' },
                { name: 'Intune', status: 'operational' }
            ]
        };
    } catch (error) {
        return {
            overall: 'unknown',
            lastSync: new Date(),
            services: []
        };
    }
};

const getUnifiStatus = async () => {
    try {
        const response = await axios.get(UNIFI_STATUS_API);
        const indicator = response.data.status.indicator;

        let normalizedStatus = 'operational';
        if (indicator === 'minor') normalizedStatus = 'degraded';
        if (indicator === 'major' || indicator === 'critical') normalizedStatus = 'outage';

        return {
            overall: normalizedStatus,
            lastSync: new Date(),
            services: [
                { name: 'Unifi Cloud Console', status: normalizedStatus },
                { name: 'Remote Access', status: normalizedStatus },
                { name: 'Ubiquiti Identity', status: normalizedStatus }
            ]
        };
    } catch (error) {
        console.error('Error fetching Unifi Status:', error.message);
        return {
            overall: 'unknown',
            lastSync: new Date(),
            services: []
        };
    }
};

const getSystemStatus = async () => {
    const [msStatus, unifiStatus] = await Promise.all([
        getMicrosoftStatus(),
        getUnifiStatus()
    ]);

    return {
        microsoft: msStatus,
        unifi: unifiStatus,
        timestamp: new Date()
    };
};

module.exports = {
    getSystemStatus
};

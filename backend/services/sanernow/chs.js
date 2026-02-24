const { sanerClient } = require('./client.js');

/**
 * Schedule/Trigger a CHS Scan
 */
const calculateHygieneScore = async () => {
    const accountName = process.env.SANERNOW_ACCOUNT_NAME;
    if (!accountName) throw new Error("SANERNOW_ACCOUNT_NAME not set");

    const res = await sanerClient.post('/CHScanner/calculateHygieneScore', {
        account_name: accountName
    });
    return res.data;
};

/**
 * Fetch Current Cyber Hygiene Score (CHS)
 */
const getAccountHygieneScore = async () => {
    const accountName = process.env.SANERNOW_ACCOUNT_NAME;
    if (!accountName) throw new Error("SANERNOW_ACCOUNT_NAME not set");

    try {
        const res = await sanerClient.get(`/CHScanner/getAccountHygieneScore?account_name=${accountName}`);

        // Sometimes the API suggests scheduling a scan if data is missing or stale
        if (res.data && typeof res.data === 'string' && res.data.includes("Schedule the CHS Scan")) {
            console.log("[SanerNow] Missing CHS Score. Triggering a scan...");
            await calculateHygieneScore();
            return {
                status: "processing",
                message: "CHS scan triggered. Data will be available later.",
                account_score: 0,
                cvss_score: 0,
                ccss_score: 0,
                missing_patch_score: 0,
                no_of_devices: 0
            };
        }

        return res.data;
    } catch (error) {
        console.error("Error fetching CHS:", error?.response?.data || error.message);
        throw error;
    }
};

/**
 * Use CHS data for top missing patches (Lightweight equivalent of getApplicableRemediation)
 */
const getTopCHSAttributes = async () => {
    const accountName = process.env.SANERNOW_ACCOUNT_NAME;
    if (!accountName) throw new Error("SANERNOW_ACCOUNT_NAME not set");

    try {
        const res = await sanerClient.get(`/CHScanner/getTopCHSAttributes?account_name=${accountName}`);
        return res.data;
    } catch (error) {
        console.error("Error fetching getTopCHSAttributes:", error?.response?.data || error.message);
        throw error;
    }
};

module.exports = {
    getAccountHygieneScore,
    calculateHygieneScore,
    getTopCHSAttributes
};

const { perform } = require('./client.js');

/**
 * Fetch Account Licenses / Subscriptions from SanerNow
 */
const getLicenseUsage = async () => {
    const accountName = process.env.SANERNOW_ACCOUNT_NAME;
    if (!accountName) throw new Error("SANERNOW_ACCOUNT_NAME not set");

    // Using empty account for getaccount, per documentation patterns 
    // Sometimes it's passed as "" or process.env.SANERNOW_ACCOUNT_NAME
    const res = await perform("", {
        request: { method: "getaccount" }
    });

    if (!res.data || !res.data.accountinfo || !res.data.accountinfo.account) {
        throw new Error("Invalid response from SanerNow getaccount");
    }

    // Usually returns an array of accounts, we find the one matching or just return the mapped list
    const accounts = Array.isArray(res.data.accountinfo.account)
        ? res.data.accountinfo.account
        : [res.data.accountinfo.account];

    return accounts.map(acc => ({
        account: acc.name,
        max: Number(acc.maxsubscriptions),
        used: Number(acc.inusesubscriptions),
        available: Number(acc.maxsubscriptions) - Number(acc.inusesubscriptions)
    }));
};

module.exports = {
    getLicenseUsage
};

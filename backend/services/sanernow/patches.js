const { perform } = require('./client.js');

/**
 * Pending patches per device
 */
const getApplicableRemediation = async (hostname) => {
    const accountName = process.env.SANERNOW_ACCOUNT_NAME;
    if (!accountName) throw new Error("SANERNOW_ACCOUNT_NAME not set");

    if (!hostname) throw new Error("Hostname is required");

    const payload = {
        request: {
            method: "getApplicableRemediation",
            parameters: {
                parameterset: [
                    {
                        parameter: [
                            { key: "accountid", value: accountName },
                            { key: "device", values: [hostname] }
                        ]
                    }
                ]
            }
        }
    };

    const res = await perform(accountName, payload);
    return res.data;
};

module.exports = {
    getApplicableRemediation
};

const { perform } = require('./client.js');

/**
 * Status of applied patches
 */
const getDeviceJobInfo = async (hostname) => {
    const accountName = process.env.SANERNOW_ACCOUNT_NAME;
    if (!accountName) throw new Error("SANERNOW_ACCOUNT_NAME not set");

    if (!hostname) throw new Error("Hostname is required");

    const payload = {
        request: {
            method: "getDeviceJobInfo",
            parameters: {
                parameterset: [
                    {
                        parameter: [
                            { key: "hostname", value: hostname },
                            { key: "accountname", value: accountName },
                            { key: "tool", values: ["PM"] }
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
    getDeviceJobInfo
};

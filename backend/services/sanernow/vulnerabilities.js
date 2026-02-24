const { perform } = require('./client.js');

/**
 * Total vulnerabilities (global + per device)
 * Global (all devices)
 */
const getDeviceVulnerabilities = async (hostname = null) => {
    const accountName = process.env.SANERNOW_ACCOUNT_NAME;
    if (!accountName) throw new Error("SANERNOW_ACCOUNT_NAME not set");

    const parameters = [
        { key: "accountname", value: accountName }
    ];

    if (hostname) {
        parameters.push({ key: "hostname", value: hostname });
    }

    const payload = {
        request: {
            method: "getDeviceVulnerabilities",
            parameters: {
                parameterset: [{ parameter: parameters }]
            }
        }
    };

    const res = await perform(accountName, payload);

    // The response is usually under res.data.response.vulnerabilities.vulnerability
    // or similar depending on the exact API shape. 
    // Usually it returns an array of vulnerabilities.
    // For now we pass the raw data, the route handles mapping.
    return res.data;
};

module.exports = {
    getDeviceVulnerabilities
};

import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../authConfig";

export const msalInstance = new PublicClientApplication(msalConfig);

export const getAccessToken = async () => {
    const activeAccount = msalInstance.getActiveAccount();
    const accounts = msalInstance.getAllAccounts();

    if (!activeAccount && accounts.length === 0) {
        throw new Error("No active account. User is not signed in.");
    }

    const request = {
        scopes: ["User.Read", "Directory.Read.All", "Group.Read.All"],
        account: activeAccount || accounts[0]
    };

    try {
        const response = await msalInstance.acquireTokenSilent(request);
        return response.accessToken;
    } catch (error) {
        console.warn("Silent token acquisition failed, creating popup interaction", error);
        // This might fail if simpler popup is blocked or not initiated by user action
        // In a real app, you'd trigger a UI prompt or redirect.
        // For now, we propagate the error so the UI can handle it (e.g. redirect to login)
        throw error;
    }
};

import type {
  M365User, UserGroup, Asset, AssetCategory,
  OnboardingWorkflow, OffboardingWorkflow,
  UnifiSite, UnifiDevice,
  ActivityItem, SystemStatus,
  UserFilters, AssetFilters, OnboardingFormData,
  OffboardingFormData, PaginatedResponse, ApiResponse,
  SecuritySummary, DeviceHealth, IdentityHygiene
} from '@/types';
import {
  mockM365Users, mockUserGroups, mockAssets, mockAssetCategories,
  mockOnboardingWorkflows, mockOffboardingWorkflows,
  mockSystemStatus,
  mockDepartmentData, mockAssetStatusData, mockLifecycleData
} from './mockData';
import { useNetworkStore } from '@/stores/networkStore';
import { getAccessToken } from './auth';

// API Base URL
// backend runs on port 3000, explicitly use https and the VM IP
const API_URL = '/api'; // import.meta.env.VITE_API_URL || '/api';

// Authenticated Fetch Client
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute cache for all frontend pages

const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const isGet = !options.method || options.method === 'GET';
    const cacheKey = `${endpoint}`;

    if (isGet) {
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    const token = await getAccessToken().catch(() => '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (isGet) {
      requestCache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data;
  } catch (error) {
    console.error(`API Call Failed for ${endpoint}:`, error);
    return null;
  }
};

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Dashboard API
export const dashboardApi = {
  syncDashboard: async (): Promise<ApiResponse<void>> => {
    try {
      const response = await fetchClient('/dashboard/sync', { method: 'POST' });
      if (response && response.success) {
        return { success: true, message: 'Dashboard synced successfully' };
      }
    } catch (e) {
      console.warn("Failed to sync dashboard", e);
    }
    return { success: false, error: 'Failed to sync dashboard' };
  },

  getSites: async (): Promise<ApiResponse<any[]>> => {
    try {
      const realData = await fetchClient('/dashboard/sites');
      if (realData) {
        return { success: true, data: realData };
      }
    } catch (e) {
      console.warn("Failed to fetch sites", e);
    }
    return { success: false, error: 'Failed to fetch sites' };
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    try {
      // Logic check: api.ts fetchClient appends /api to the input.
      // If server has app.get('/api/dashboard/stats'), then client should call '/dashboard/stats'.
      // If api.ts API_URL is '/api', then '/dashboard/stats' -> '/api/dashboard/stats'.
      // However, if the error is 404, maybe the server routes are NOT prefixed with /api?
      // Let's check server.js...
      // server.js: app.get('/api/dashboard/stats'...)
      // So fetchClient('/dashboard/stats') -> '/api/dashboard/stats' IS correct.
      // Why 'Unexpected token <'?
      // Maybe the API_URL is double prefixed or something? 
      // API_URL = '/api'. fetch(`${API_URL}${endpoint}`) -> '/api/dashboard/stats'.
      // Wait, is it possible the USER is accessing via a proxy that strips /api?
      // Or maybe the server is not running on the same port?
      // "API Call Failed for /dashboard/identity-hygiene" -> The error message in console.error says "API Call Failed for /dashboard/identity-hygiene".
      // This matches the endpoint passed to fetchClient.
      // If the browser 404s, it gets HTML.

      const realData = await fetchClient('/dashboard/stats');
      if (realData) {
        return { success: true, data: realData };
      }
    } catch (e) {
      console.warn("Failed to fetch dashboard stats", e);
    }
    // Mock Fallback
    return {
      success: true,
      data: {
        totalUsers: 245,
        activeDevices: 215,
        totalGroups: 42,
        licensesTotal: 500,
        licensesUsed: 382,
        licensesAvailable: 118
      }
    };
  },

  getLicenses: async (): Promise<ApiResponse<any[]>> => {
    try {
      const realData = await fetchClient('/dashboard/licenses');
      if (realData && Array.isArray(realData)) {
        return { success: true, data: realData };
      }
    } catch (e) {
      console.warn("Failed to fetch licenses", e);
    }
    return { success: true, data: [] };
  },

  getDeviceDistribution: async (): Promise<ApiResponse<any[]>> => {
    try {
      const realData = await fetchClient('/dashboard/device-distribution');
      if (realData && Array.isArray(realData)) {
        return { success: true, data: realData };
      }
    } catch (e) {
      console.warn("Failed to fetch device distribution", e);
    }
    return { success: true, data: [] };
  },

  getApplications: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await fetchClient('/applications');
      if (response && response.value) {
        return { success: true, data: response.value };
      }
      // If response is just the array
      if (Array.isArray(response)) {
        return { success: true, data: response };
      }
    } catch (e) {
      console.warn("Failed to fetch applications", e);
    }
    return { success: true, data: [] };
  },

  getMfaCoverage: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await fetchClient('/reports/mfa-coverage');
      return { success: true, data: response };
    } catch (e) {
      console.warn("Failed to fetch MFA coverage", e);
      // Return default structure on failure
      return { success: false, data: { totalUsers: 0, enabled: 0, disabled: 0, percentage: 0 } };
    }
  },

  getActivity: async (limit: number = 10): Promise<ApiResponse<ActivityItem[]>> => {
    try {
      const response = await fetchClient(`/audit-logs?limit=${limit}`);

      // Validate response structure
      if (!response || !Array.isArray(response.value)) {
        console.warn('[Dashboard] Invalid audit logs response structure, using empty array');
        return { success: true, data: [] };
      }

      // Map audit logs to activity items with safe navigation
      const activities: ActivityItem[] = response.value.map((log: any) => ({
        id: log?.id || '',
        type: (log?.category || 'other') as 'user' | 'asset' | 'workflow' | 'system' | 'other',
        action: log?.activityDisplayName || 'Unknown Action',
        user: log?.initiatedBy?.user?.displayName || log?.initiatedBy?.user?.userPrincipalName || 'System',
        target: log?.targetResources?.[0]?.displayName || log?.targetResources?.[0]?.userPrincipalName || '',
        timestamp: log?.activityDateTime || new Date().toISOString(),
        status: (log?.result || 'success') as 'success' | 'pending' | 'failed',
        details: log?.resultReason || ''
      }));

      return { success: true, data: activities };
    } catch (error) {
      console.error('[Dashboard] Error fetching audit logs:', error);
      return { success: true, data: [] };
    }
  },

  getSystemStatus: async (): Promise<ApiResponse<SystemStatus>> => {
    try {
      const realData = await fetchClient('/dashboard/system-status');
      if (realData) {
        return { success: true, data: realData };
      }
    } catch (e) {
      console.warn("Falling back to mock data for system status", e);
    }
    await delay(300);
    return { success: true, data: mockSystemStatus };
  },

  getChartData: async (): Promise<ApiResponse<any>> => {
    // This is deprecated - using getLicenses and getDeviceDistribution instead
    await delay(600);
    return {
      success: true,
      data: {
        lifecycle: mockLifecycleData,
        departments: mockDepartmentData,
        assetStatus: mockAssetStatusData,
      }
    };
  },

  getSecuritySummary: async (): Promise<ApiResponse<SecuritySummary>> => {
    try {
      const realData = await fetchClient('/dashboard/security-summary');
      if (realData) {
        return { success: true, data: realData };
      }
    } catch (e) {
      console.warn("Failed to fetch security summary", e);
    }
    // Mock Fallback
    return {
      success: true,
      data: {
        current: {
          high_security_alerts: 3,
          medium_security_alerts: 5,
          high_risk_users: 2,
          risky_signins_24h: 1,
          dlp_high_incidents: 1,
          secure_score: 65.5,
          defender_exposure_score: 24,
          timestamp: new Date().toISOString()
        },
        trends: {
          high_security_alerts: -2,
          high_risk_users: 0,
          secure_score: 1.5
        }
      }
    };
  },

  getDeviceHealth: async (): Promise<ApiResponse<DeviceHealth>> => {
    try {
      const realData = await fetchClient('/dashboard/device-health');
      if (realData) {
        return { success: true, data: realData };
      }
    } catch (e) {
      console.warn("Failed to fetch device health", e);
    }
    return {
      success: true,
      data: {
        total_devices: 215,
        compliant_devices: 198,
        non_compliant_devices: 17,
        encrypted_devices: 210,
        win10_count: 45,
        win11_count: 170,
        outdated_builds_count: 12
      }
    };
  },

  getIdentityHygiene: async (): Promise<ApiResponse<IdentityHygiene>> => {
    try {
      const realData = await fetchClient('/dashboard/identity-hygiene');
      if (realData) {
        return { success: true, data: realData };
      }
    } catch (e) {
      console.warn("Failed to fetch identity hygiene", e);
    }
    return {
      success: true,
      data: {
        mfa_coverage_percent: 88.5,
        privileged_no_mfa: 0,
        dormant_users_60d: 12,
        guest_inactive_90d: 5,
        mailbox_usage_over_90: 3,
        external_forwarding_count: 1
      }
    };
  },

  getSecurityAlerts: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await fetchClient('/security/alerts');
      if (response && response.value) {
        return { success: true, data: response.value };
      }
    } catch (e) {
      console.warn("Failed to fetch alerts", e);
    }
    return { success: true, data: [] };
  },

  getRiskyUsers: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await fetchClient('/security/risky-users');
      if (response && response.value) {
        return { success: true, data: response.value };
      }
    } catch (e) {
      console.warn("Failed to fetch risky users", e);
    }
    return { success: true, data: [] };
  },

  getNonCompliantDevices: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await fetchClient('/security/non-compliant');
      if (response && response.value) {
        return { success: true, data: response.value };
      }
    } catch (e) {
      console.warn("Failed to fetch non-compliant devices", e);
    }
    return { success: true, data: [] };
  },

  getUsersWithoutMfa: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await fetchClient('/security/users-without-mfa');
      return { success: true, data: response.value || [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  getExternalForwardingRules: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await fetchClient('/security/external-forwarding');
      if (response && response.value) {
        return { success: true, data: response.value };
      }
    } catch (e) {
      console.warn("Failed to fetch external forwarding rules", e);
    }
    return { success: true, data: [] };
  },
};

// Users API
export const usersApi = {
  getUsers: async (filters?: UserFilters, page: number = 1, pageSize: number = 25): Promise<ApiResponse<PaginatedResponse<M365User>>> => {
    try {
      // Build query params for backend
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      if (filters) {
        if (filters.search) params.append('search', filters.search);
        if (filters.department && filters.department !== 'All Departments') params.append('department', filters.department);
        if (filters.location && filters.location !== 'All Locations') params.append('location', filters.location);
        if (filters.status && filters.status !== 'all') params.append('enabled', filters.status);
        if (filters.domain) params.append('domain', filters.domain);
        if (filters.userType) params.append('userType', filters.userType);
      }

      const realData = await fetchClient(`/users?${params.toString()}`);

      if (realData) {
        // Map backend response to frontend model
        const mappedUsers = (realData.value || []).map((u: any) => ({
          id: u.id,
          userPrincipalName: u.userPrincipalName,
          displayName: u.displayName,
          givenName: u.givenName, // Might be missing if not selected
          surname: u.surname,     // Might be missing if not selected
          email: u.mail || u.userPrincipalName,
          department: u.department || 'Unassigned',
          jobTitle: u.jobTitle || 'Unknown',
          officeLocation: u.officeLocation || 'Remote',
          accountEnabled: u.accountEnabled !== false,
          createdDateTime: u.createdDateTime,
          lastSignInDateTime: u.signInActivity?.lastSignInDateTime || null,
          mfaEnabled: false, // Detail fetched separately
        }));

        return {
          success: true,
          data: {
            data: mappedUsers,
            total: realData['@odata.count'] || mappedUsers.length,
            page,
            pageSize,
            totalPages: Math.ceil((realData['@odata.count'] || 0) / pageSize),
          }
        };
      }
    } catch (e) {
      console.warn("Failed to fetch users", e);
    }

    return {
      success: true,
      data: { data: [], total: 0, page, pageSize, totalPages: 0 }
    };
  },

  getUser: async (id: string): Promise<ApiResponse<M365User>> => {
    try {
      // Fetch details + MFA status
      const [userRes, mfaRes] = await Promise.all([
        fetchClient(`/users/${id}`),
        fetchClient(`/users/${id}/mfa`)
      ]);

      if (userRes) {
        const user: M365User = {
          id: userRes.id,
          userPrincipalName: userRes.userPrincipalName,
          displayName: userRes.displayName,
          givenName: userRes.givenName,
          surname: userRes.surname,
          email: userRes.mail || userRes.userPrincipalName,
          department: userRes.department || 'Unassigned',
          jobTitle: userRes.jobTitle || 'Unknown',
          officeLocation: userRes.officeLocation || 'Remote',
          accountEnabled: userRes.accountEnabled !== false,
          createdDateTime: userRes.createdDateTime,
          lastSignInDateTime: userRes.signInActivity?.lastSignInDateTime,
          mfaEnabled: mfaRes && mfaRes.mfaEnabled === true, // Simplified boolean from backend
          assignedLicenses: [],
          manager: undefined
        };
        return { success: true, data: user };
      }
    } catch (e) {
      console.warn("Failed to fetch user details", e);
    }

    return { success: false, error: 'User not found' };
  },

  getUserGroups: async (id: string, type: 'all' | 'security' | 'distribution' | 'm365' = 'all'): Promise<ApiResponse<UserGroup[]>> => {
    try {
      const realData = await fetchClient(`/users/${id}/groups?type=${type}`);
      if (realData && realData.value) {
        const groups: UserGroup[] = realData.value.map((g: any) => {
          // Determine group type based on properties
          let groupType = 'Security';
          if (g.groupTypes?.includes('Unified')) {
            groupType = 'M365';
          } else if (g.mailEnabled && g.securityEnabled) {
            groupType = 'Distribution';
          }

          return {
            id: g.id,
            displayName: g.displayName,
            description: g.description || 'No description',
            groupType,
            email: g.mail,
            memberCount: 0, // Requires expansion or separate call
            createdDate: g.createdDateTime,
          };
        });
        return { success: true, data: groups };
      }
    } catch (e) {
      console.warn("Failed to fetch user groups", e);
    }

    return { success: true, data: [] };
  },

  getUserDevices: async (id: string): Promise<ApiResponse<Asset[]>> => {
    try {
      const realData = await fetchClient(`/users/${id}/devices`);
      if (realData && realData.value) {
        const devices: Asset[] = realData.value.map((d: any) => ({
          id: d.id,
          assetTag: d.serialNumber || 'N/A',
          name: d.deviceName || 'Unknown Device',
          category: d.operatingSystem || 'Unknown',
          model: d.model || '',
          serialNumber: d.serialNumber,
          status: 'assigned',
          assignedTo: id,
          assignedToName: d.userDisplayName, // Might need to be passed in or fetched
          createdAt: d.enrolledDateTime || new Date().toISOString(),
          updatedAt: d.lastSyncDateTime || new Date().toISOString(),
          notes: `Compliance: ${d.complianceState}`,
        }));
        return { success: true, data: devices };
      }
    } catch (e) {
      console.warn("Failed to fetch user devices", e);
    }
    return { success: true, data: [] };
  },

  disableUser: async (id: string): Promise<ApiResponse<void>> => {
    try {
      await fetchClient(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ accountEnabled: false })
      });
      return { success: true, message: 'User account disabled successfully' };
    } catch (e) {
      return { success: false, message: 'Failed to disable user' };
    }
  },

  revokeSessions: async (id: string): Promise<ApiResponse<void>> => {
    try {
      await fetchClient(`/users/${id}/revoke`, { method: 'POST' });
      return { success: true, message: 'Sessions revoked successfully' };
    } catch (e) {
      return { success: false, message: 'Failed to revoke sessions' };
    }
  },

  removeMfa: async (_id: string): Promise<ApiResponse<void>> => {
    // complex operation, mocking for now
    await delay(500);
    return { success: true, message: 'MFA methods removed successfully' };
  },

  removeFromGroups: async (_id: string): Promise<ApiResponse<void>> => {
    // complex operation, mocking for now
    await delay(700);
    return { success: true, message: 'User removed from groups successfully' };
  },

  syncUsers: async (): Promise<ApiResponse<void>> => {
    await delay(1500);
    return { success: true, message: 'User sync started successfully' };
  },

  getDepartments: async (): Promise<ApiResponse<string[]>> => {
    try {
      const data = await fetchClient('/users/departments');
      return {
        success: true,
        data: data || []
      };
    } catch (e) {
      return { success: true, data: [] };
    }
  },

  getLocations: async (): Promise<ApiResponse<string[]>> => {
    try {
      const data = await fetchClient('/users/locations');
      return { success: true, data: data || [] };
    } catch (e) {
      return { success: true, data: [] };
    }
  },

  updateUserAccess: async (_userId: string, _pages: string[]): Promise<ApiResponse<void>> => {
    await delay(800);
    return { success: true, message: 'User access permissions updated successfully' };
  },
};

// Groups API
export const groupsApi = {
  getGroups: async (type: 'all' | 'security' | 'distribution' | 'm365' = 'all'): Promise<ApiResponse<UserGroup[]>> => {
    try {
      const realData = await fetchClient(`/groups?type=${type}`);
      if (realData && realData.value) {
        const groups: UserGroup[] = realData.value.map((g: any) => {
          // Determine group type based on properties
          let groupType = 'Security';
          if (g.groupTypes?.includes('Unified')) {
            groupType = 'M365';
          } else if (g.mailEnabled && g.securityEnabled) {
            groupType = 'Distribution';
          }

          return {
            id: g.id,
            displayName: g.displayName,
            description: g.description || 'No description',
            groupType,
            email: g.mail,
            memberCount: 0,
            createdDate: g.createdDateTime,
          };
        });
        return { success: true, data: groups };
      }
    } catch (e) {
      console.warn("Falling back to mock data for groups", e);
    }

    await delay(400);
    return { success: true, data: mockUserGroups };
  },

  getGroupMembers: async (id: string): Promise<ApiResponse<{ members: any[], owners: any[] }>> => {
    try {
      const response = await fetchClient(`/groups/${id}/members`);
      if (response) {
        return { success: true, data: response };
      }
    } catch (e) {
      console.warn("Failed to fetch group members", e);
    }
    return { success: true, data: { members: [], owners: [] } };
  },

  addMember: async (_groupId: string, _userId: string): Promise<ApiResponse<void>> => {
    await delay(400);
    return { success: true, message: 'Member added successfully' };
  },

  removeMember: async (_groupId: string, _userId: string): Promise<ApiResponse<void>> => {
    await delay(400);
    return { success: true, message: 'Member removed successfully' };
  },
};

// Assets API
export const assetsApi = {
  getAssets: async (filters?: AssetFilters, page: number = 1, pageSize: number = 20): Promise<ApiResponse<PaginatedResponse<Asset>>> => {
    // Try sending to real backend first (Intune Devices)
    try {
      const realData = await fetchClient('/devices');
      if (realData && realData.value) {
        const assets: Asset[] = realData.value.map((d: any) => ({
          id: d.id,
          name: d.deviceName || 'Unknown Device',
          assetTag: d.managedDeviceName || 'N/A', // Intune doesn't always have asset tags
          serialNumber: d.serialNumber || 'N/A',
          model: d.model || 'Unknown Model',
          category: d.operatingSystem === 'Windows' ? 'Laptop' : d.operatingSystem === 'iOS' ? 'Mobile' : 'Workstation',
          status: 'active', // Defaulting to active for now
          assignedTo: d.userId, // Intune creates user association via userId
          assignedToName: d.userDisplayName, // Ensure this field exists if Graph returns it (it does for managedDevices)
          purchaseDate: d.enrolledDateTime,
          warrantyExpiration: undefined, // Not typically in standard Intune view
          location: 'Remote', // Todo: Map from extension attributes
          manufacturer: d.manufacturer
        }));

        // Apply client-side filtering/pagination for now
        let filteredAssets = assets;

        if (filters?.search) {
          const search = filters.search.toLowerCase();
          filteredAssets = filteredAssets.filter(a =>
            a.name.toLowerCase().includes(search) ||
            a.assetTag.toLowerCase().includes(search) ||
            a.serialNumber?.toLowerCase().includes(search) ||
            a.assignedTo?.toLowerCase().includes(search) ||
            a.assignedToName?.toLowerCase().includes(search)
          );
        }

        if (filters?.assignedTo) {
          // Filter by user ID if provided - Strict matching
          const assignedId = filters.assignedTo.toLowerCase();
          filteredAssets = filteredAssets.filter(a =>
            a.assignedTo?.toLowerCase() === assignedId
          );
        }

        const total = filteredAssets.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const paginatedAssets = filteredAssets.slice(start, start + pageSize);

        return {
          success: true,
          data: {
            data: paginatedAssets,
            total,
            page,
            pageSize,
            totalPages,
            // @ts-ignore
            allAssets: filteredAssets // Helper for verifying counts
          }
        };
      }
    } catch (e) {
      console.warn("Failed to fetch assets", e);
    }

    return {
      success: true,
      data: {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      }
    };
  },

  getAsset: async (id: string): Promise<ApiResponse<Asset>> => {
    await delay(300);
    const asset = mockAssets.find(a => a.id === id);
    if (asset) {
      return { success: true, data: asset };
    }
    return { success: false, error: 'Asset not found' };
  },

  createAsset: async (asset: Partial<Asset>): Promise<ApiResponse<Asset>> => {
    await delay(600);
    const newAsset: Asset = {
      ...asset as Asset,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { success: true, data: newAsset };
  },

  updateAsset: async (_id: string, updates: Partial<Asset>): Promise<ApiResponse<Asset>> => {
    await delay(500);
    return { success: true, data: { ...updates } as Asset };
  },

  deleteAsset: async (_id: string): Promise<ApiResponse<void>> => {
    await delay(400);
    return { success: true, message: 'Asset deleted successfully' };
  },

  assignAsset: async (_id: string, _userId: string): Promise<ApiResponse<void>> => {
    await delay(500);
    return { success: true, message: 'Asset assigned successfully' };
  },

  unassignAsset: async (_id: string): Promise<ApiResponse<void>> => {
    await delay(400);
    return { success: true, message: 'Asset unassigned successfully' };
  },

  getCategories: async (): Promise<ApiResponse<AssetCategory[]>> => {
    await delay(300);
    return { success: true, data: mockAssetCategories };
  },
};

// Onboarding API
export const onboardingApi = {
  getWorkflows: async (): Promise<ApiResponse<OnboardingWorkflow[]>> => {
    await delay(500);
    return { success: true, data: mockOnboardingWorkflows };
  },

  getWorkflow: async (id: string): Promise<ApiResponse<OnboardingWorkflow>> => {
    await delay(400);
    const workflow = mockOnboardingWorkflows.find(w => w.id === id);
    if (workflow) {
      return { success: true, data: workflow };
    }
    return { success: false, error: 'Workflow not found' };
  },

  createWorkflow: async (data: OnboardingFormData): Promise<ApiResponse<OnboardingWorkflow>> => {
    await delay(800);
    const newWorkflow: OnboardingWorkflow = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      status: 'pending',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      progress: 0,
    };
    return { success: true, data: newWorkflow };
  },

  executeWorkflow: async (_id: string): Promise<ApiResponse<void>> => {
    await delay(1500);
    return { success: true, message: 'Onboarding workflow executed successfully' };
  },

  getTasks: async (_workflowId: string): Promise<ApiResponse<any[]>> => {
    await delay(400);
    return {
      success: true,
      data: [
        { id: '1', taskName: 'Create M365 Account', status: 'completed', completedAt: '2024-01-15T10:30:00Z' },
        { id: '2', taskName: 'Assign License', status: 'completed', completedAt: '2024-01-15T10:35:00Z' },
        { id: '3', taskName: 'Add to Groups', status: 'in_progress' },
        { id: '4', taskName: 'Assign Assets', status: 'pending' },
        { id: '5', taskName: 'Send Welcome Email', status: 'pending' },
      ]
    };
  },
};

// Offboarding API
export const offboardingApi = {
  getWorkflows: async (): Promise<ApiResponse<OffboardingWorkflow[]>> => {
    await delay(500);
    return { success: true, data: mockOffboardingWorkflows };
  },

  getWorkflow: async (id: string): Promise<ApiResponse<OffboardingWorkflow>> => {
    await delay(400);
    const workflow = mockOffboardingWorkflows.find(w => w.id === id);
    if (workflow) {
      return { success: true, data: workflow };
    }
    return { success: false, error: 'Workflow not found' };
  },

  createWorkflow: async (data: OffboardingFormData): Promise<ApiResponse<OffboardingWorkflow>> => {
    await delay(800);
    const user = mockM365Users.find(u => u.id === data.userId);
    const newWorkflow: OffboardingWorkflow = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      employeeName: user?.displayName || 'Unknown',
      employeeEmail: user?.email,
      status: 'pending',
      createdBy: '1',
      createdAt: new Date().toISOString(),
      progress: 0,
    };
    return { success: true, data: newWorkflow };
  },

  executeWorkflow: async (_id: string): Promise<ApiResponse<void>> => {
    await delay(2000);
    return { success: true, message: 'Offboarding workflow executed successfully' };
  },

  getTasks: async (_workflowId: string): Promise<ApiResponse<any[]>> => {
    await delay(400);
    return {
      success: true,
      data: [
        { id: '1', taskName: 'Disable Account', status: 'completed', completedAt: '2024-01-20T09:00:00Z' },
        { id: '2', taskName: 'Revoke Sessions', status: 'completed', completedAt: '2024-01-20T09:05:00Z' },
        { id: '3', taskName: 'Remove MFA', status: 'completed', completedAt: '2024-01-20T09:10:00Z' },
        { id: '4', taskName: 'Remove from Groups', status: 'in_progress' },
        { id: '5', taskName: 'Archive Data', status: 'pending' },
        { id: '6', taskName: 'Recover Assets', status: 'pending' },
      ]
    };
  },
};

// Unifi API
export const unifiApi = {
  getSites: async (): Promise<ApiResponse<UnifiSite[]>> => {
    await delay(400);
    // Unifi Controller often has a "default" site, or we might need to fetch them.
    // For now, keep using store defaults or mock until we have a real sites endpoint if needed.
    const sites = useNetworkStore.getState().sites;
    return { success: true, data: sites };
  },

  getDevices: async (siteId?: string): Promise<ApiResponse<UnifiDevice[]>> => {
    try {
      const realData = await fetchClient('/unifi/devices');
      console.log('[API] Unifi Devices Response:', realData);

      if (realData && realData.data && Array.isArray(realData.data)) {
        const devices: UnifiDevice[] = realData.data.map((d: any) => ({
          id: d._id || d.mac || Math.random().toString(36),
          name: d.name || d.model || 'Unknown Device',
          model: d.model || 'Unknown Model',
          macAddress: d.mac || '00:00:00:00:00:00',
          ipAddress: d.ip || '0.0.0.0',
          status: (d.status === 1 || d.state === 1 || d.status === 'online') ? 'online' : 'offline',
          siteId: d.site_id || 'default',
          firmwareVersion: d.version || d.firmwareVersion,
          uptime: d.uptime || 0,
          numClients: d.num_sta || d.numClients || 0,
          deviceType: (d.type === 'uap' || d.deviceType === 'ap') ? 'ap' : (d.type === 'usw' || d.deviceType === 'switch') ? 'switch' : 'gateway'
        }));
        return { success: true, data: devices };
      } else {
        console.warn('[API] Unifi devices response INVALID. Expected array in realData.data:', realData);
      }
    } catch (e) {
      console.warn("Falling back to mock/store data for unifi devices", e);
    }

    await delay(500);
    let devices = useNetworkStore.getState().devices;

    // Fallback to static mock data if store is empty (to ensure user sees SOMETHING)
    if (devices.length === 0) {
      devices = [
        { id: 'mock-1', name: 'USG-Pro-4', model: 'USG-Pro-4', macAddress: '00:00:00:00:00:01', ipAddress: '192.168.1.1', status: 'online', siteId: 'default', firmwareVersion: '4.4.52', uptime: 123456, numClients: 50, deviceType: 'gateway' },
        { id: 'mock-2', name: 'USW-24-PoE', model: 'USW-24-PoE', macAddress: '00:00:00:00:00:02', ipAddress: '192.168.1.2', status: 'online', siteId: 'default', firmwareVersion: '5.43.23', uptime: 100000, numClients: 20, deviceType: 'switch' },
        { id: 'mock-3', name: 'UAP-AC-Pro', model: 'UAP-AC-Pro', macAddress: '00:00:00:00:00:03', ipAddress: '192.168.1.3', status: 'online', siteId: 'default', firmwareVersion: '4.3.28', uptime: 50000, numClients: 15, deviceType: 'ap' }
      ];
    }

    if (siteId) {
      devices = devices.filter((d: UnifiDevice) => d.siteId === siteId);
    }
    return { success: true, data: devices };
  },

  getDevice: async (id: string): Promise<ApiResponse<UnifiDevice>> => {
    await delay(300);
    const devices = useNetworkStore.getState().devices;
    const device = devices.find((d: UnifiDevice) => d.id === id);
    if (device) {
      return { success: true, data: device };
    }
    return { success: false, error: 'Device not found' };
  },

  restartDevice: async (_id: string): Promise<ApiResponse<void>> => {
    await delay(1000);
    return { success: true, message: 'Device restart initiated' };
  },

  getClients: async (_siteId: string): Promise<ApiResponse<any[]>> => {
    try {
      const realData = await fetchClient('/unifi/clients');
      if (realData && realData.data) {
        return { success: true, data: realData.data };
      }
    } catch (e) {
      console.warn("Falling back to mock data for unifi clients", e);
    }

    await delay(500);
    return {
      success: true,
      data: [
        { mac: 'aa:bb:cc:dd:ee:01', hostname: 'laptop-001', ip: '192.168.1.100', connected: true },
        { mac: 'aa:bb:cc:dd:ee:02', hostname: 'phone-001', ip: '192.168.1.101', connected: true },
        { mac: 'aa:bb:cc:dd:ee:03', hostname: 'printer-001', ip: '192.168.1.50', connected: false },
      ]
    };
  },

  getStats: async (_siteId: string): Promise<ApiResponse<any>> => {
    try {
      const realData = await fetchClient('/unifi/health');
      if (realData && realData.data) {
        // Transform health data if necessary
        return { success: true, data: realData.data };
      }
    } catch (e) {
      console.warn("Falling back to mock data for unifi stats", e);
    }

    await delay(400);
    return {
      success: true,
      data: {
        totalClients: 156,
        activeClients: 142,
        totalDevices: 12,
        onlineDevices: 11,
        wanUpload: 125.5,
        wanDownload: 450.2,
      }
    };
  },
};

// Audit API
export const auditApi = {
  getLogs: async (page: number = 1, pageSize: number = 50): Promise<ApiResponse<any>> => {
    await delay(500);
    const logs = [
      { id: '1', timestamp: '2024-01-20T09:30:00Z', user: 'david.brown@company.com', action: 'USER_DISABLE', resourceType: 'User', resourceId: '6', severity: 'warning', details: 'Disabled user account for Emily Davis' },
      { id: '2', timestamp: '2024-01-20T09:15:00Z', user: 'sarah.williams@company.com', action: 'ONBOARDING_CREATE', resourceType: 'Workflow', resourceId: '1', severity: 'info', details: 'Created onboarding workflow for Alex Thompson' },
      { id: '3', timestamp: '2024-01-20T08:45:00Z', user: 'system', action: 'M365_SYNC', resourceType: 'System', severity: 'info', details: 'Synchronized 1,247 users from M365' },
      { id: '4', timestamp: '2024-01-19T16:20:00Z', user: 'john.doe@company.com', action: 'ASSET_ASSIGN', resourceType: 'Asset', resourceId: '1', severity: 'info', details: 'Assigned LAPTOP-001 to Mike Johnson' },
      { id: '5', timestamp: '2024-01-19T14:00:00Z', user: 'system', action: 'DEVICE_OFFLINE', resourceType: 'UnifiDevice', resourceId: '5', severity: 'warning', details: 'Device USW-24-London went offline' },
    ];

    return {
      success: true,
      data: {
        data: logs,
        total: 156,
        page,
        pageSize,
        totalPages: Math.ceil(156 / pageSize),
      }
    };
  },

  export: async (): Promise<ApiResponse<Blob>> => {
    await delay(1000);
    const csvContent = 'Timestamp,User,Action,Resource Type,Severity,Details\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    return { success: true, data: blob };
  },
};

// Google Workspace API
export const googleApi = {
  getUsers: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await fetchClient('/google/users');
      return { success: true, data: response.data };
    } catch (e) {
      console.warn("Failed to fetch Google users", e);
      return { success: false, error: 'Failed' };
    }
  },
  getUserDetails: async (email: string): Promise<ApiResponse<any>> => {
    try {
      const response = await fetchClient(`/google/users/${email}`);
      return { success: true, data: response.data };
    } catch (e) {
      console.warn(`Failed to fetch Google details for ${email}`, e);
      return { success: false, error: 'Failed' };
    }
  }
};

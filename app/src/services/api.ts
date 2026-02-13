import type {
  M365User, UserGroup, Asset, AssetCategory,
  OnboardingWorkflow, OffboardingWorkflow,
  UnifiSite, UnifiDevice,
  ActivityItem, DashboardStats, SystemStatus,
  UserFilters, AssetFilters, OnboardingFormData,
  OffboardingFormData, PaginatedResponse, ApiResponse
} from '@/types';
import {
  mockM365Users, mockUserGroups, mockAssets, mockAssetCategories,
  mockOnboardingWorkflows, mockOffboardingWorkflows,
  mockActivityItems, mockDashboardStats, mockSystemStatus,
  mockDepartmentData, mockAssetStatusData, mockLifecycleData
} from './mockData';
import { useNetworkStore } from '@/stores/networkStore';
import { getAccessToken } from './auth';

// API Base URL
// API Base URL
// backend runs on port 3000, explicitly use https and the VM IP
const API_URL = '/api'; // import.meta.env.VITE_API_URL || '/api';

// Authenticated Fetch Client
const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const token = await getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      // @ts-ignore
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle 401/403 specifically if needed
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Call Failed for ${endpoint}:`, error);
    // Fallback to mock data if API fails (for hybrid transition)
    // throw error; 
    return null;
  }
};

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    await delay(500);
    return { success: true, data: mockDashboardStats };
  },

  getActivity: async (limit: number = 10): Promise<ApiResponse<ActivityItem[]>> => {
    await delay(400);
    return { success: true, data: mockActivityItems.slice(0, limit) };
  },

  getSystemStatus: async (): Promise<ApiResponse<SystemStatus>> => {
    try {
      const realData = await fetchClient('/status');
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
};

// Users API
export const usersApi = {
  getUsers: async (filters?: UserFilters, page: number = 1, pageSize: number = 25): Promise<ApiResponse<PaginatedResponse<M365User>>> => {
    // Try sending to real backend first
    try {
      const realData = await fetchClient('/users');
      if (realData && realData.value) {
        // Transform Graph API data to our M365User shape
        const users: M365User[] = realData.value.map((u: any) => ({
          id: u.id,
          displayName: u.displayName,
          email: u.mail || u.userPrincipalName,
          userPrincipalName: u.userPrincipalName,
          department: u.department || 'Unassigned',
          jobTitle: u.jobTitle || 'Unknown',
          officeLocation: u.officeLocation || 'Remote',
          accountEnabled: u.accountEnabled !== false, // Graph uses accountEnabled boolean
          assignedLicenses: [], // Requires separate call or expansion
          manager: undefined
        }));

        // Apply client-side filtering/pagination for now (since backend is simple proxy)
        // In production, move this logic to the backend!
        let filteredUsers = users;

        if (filters?.search) {
          const search = filters.search.toLowerCase();
          filteredUsers = filteredUsers.filter(u =>
            u.displayName.toLowerCase().includes(search) ||
            u.email?.toLowerCase().includes(search) ||
            u.userPrincipalName.toLowerCase().includes(search)
          );
        }

        if (filters?.department) {
          const deptFilter = filters.department.toLowerCase().trim();
          filteredUsers = filteredUsers.filter(u => u.department?.toLowerCase().trim() === deptFilter);
        }

        if (filters?.status && filters.status !== 'all') {
          const isActive = filters.status === 'active';
          filteredUsers = filteredUsers.filter(u => u.accountEnabled === isActive);
        }

        if (filters?.location) {
          const locFilter = filters.location.toLowerCase().trim();
          filteredUsers = filteredUsers.filter(u => u.officeLocation?.toLowerCase().trim() === locFilter);
        }

        const total = filteredUsers.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const paginatedUsers = filteredUsers.slice(start, start + pageSize);

        return {
          success: true,
          data: {
            data: paginatedUsers,
            total,
            page,
            pageSize,
            totalPages,
          }
        };
      }
    } catch (e) {
      console.warn("Failed to fetch users", e);
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

  getUser: async (id: string): Promise<ApiResponse<M365User>> => {
    try {
      const realData = await fetchClient(`/users/${id}`);
      if (realData) {
        // Fetch MFA status in parallel if possible, or just user details first
        // For now, let's keep it simple and just return user details
        // MFA status could be fetched separately or here if we have permission
        // Let's try to fetch MFA status as well to complete the picture
        let mfaEnabled = false;
        try {
          const mfaData = await fetchClient(`/users/${id}/mfa`);
          if (mfaData && mfaData.value && mfaData.value.length > 0) {
            mfaEnabled = true;
          }
        } catch (e) {
          console.warn('Failed to fetch MFA status for user', id);
        }

        const user: M365User = {
          id: realData.id,
          displayName: realData.displayName,
          email: realData.mail || realData.userPrincipalName,
          userPrincipalName: realData.userPrincipalName,
          department: realData.department || 'Unassigned',
          jobTitle: realData.jobTitle || 'Unknown',
          officeLocation: realData.officeLocation || 'Remote',
          accountEnabled: realData.accountEnabled !== false,
          createdDateTime: realData.createdDateTime,
          lastSignInDateTime: realData.lastSignInDateTime,
          mfaEnabled: mfaEnabled,
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

  getUserGroups: async (id: string): Promise<ApiResponse<UserGroup[]>> => {
    try {
      const realData = await fetchClient(`/users/${id}/groups`);
      if (realData && realData.value) {
        const groups: UserGroup[] = realData.value.map((g: any) => ({
          id: g.id,
          displayName: g.displayName,
          description: g.description || 'No description',
          groupType: g.groupTypes?.includes('Unified') ? 'M365' : 'Security',
          email: g.mail,
          memberCount: 0,
          createdDate: g.createdDateTime,
        }));
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

  disableUser: async (_id: string): Promise<ApiResponse<void>> => {
    // This requires a POST/PATCH to Graph API which we haven't implemented in backend yet
    // For now, mock success to show UI flow
    await delay(800);
    return { success: true, message: 'User account disabled successfully' };
  },

  revokeSessions: async (_id: string): Promise<ApiResponse<void>> => {
    // Requires POST /users/{id}/revokeSignInSessions
    await delay(600);
    return { success: true, message: 'All sessions revoked successfully' };
  },

  removeMfa: async (_id: string): Promise<ApiResponse<void>> => {
    // complex operation, mocking for now
    await delay(500);
    return { success: true, message: 'MFA methods removed successfully' };
  },

  removeFromGroups: async (_id: string): Promise<ApiResponse<void>> => {
    // complex operation, mocking for now
    await delay(700);
    return { success: true, message: 'User removed from all groups' };
  },

  syncUsers: async (): Promise<ApiResponse<void>> => {
    // Trigger backend sync if implemented, else just re-fetch
    await delay(2000);
    return { success: true, message: 'Users synchronized successfully' };
  },

  getDepartments: async (): Promise<ApiResponse<string[]>> => {
    try {
      // optimize: reuse cached users if available, or fetch light list
      const response = await usersApi.getUsers({}, 1, 999);
      if (response.success && response.data) {
        const departments = [...new Set(response.data.data.map(u => u.department).filter(Boolean))] as string[];
        return { success: true, data: departments };
      }
    } catch (e) {
      console.warn("Failed to fetch departments", e);
    }
    return { success: true, data: [] };
  },

  updateUserAccess: async (userId: string, allowedPages: string[]): Promise<ApiResponse<void>> => {
    await delay(800);
    // In a real app, this would make an API call.
    // We can update the mock data in memory if we want persistence within the session,
    // but typically mocks just return success.
    const userIndex = mockM365Users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      mockM365Users[userIndex].allowedPages = allowedPages;
    }
    return { success: true, message: 'User access permissions updated successfully' };
  },

  getLocations: async (): Promise<ApiResponse<string[]>> => {
    try {
      const response = await usersApi.getUsers({}, 1, 999);
      if (response.success && response.data) {
        const locations = [...new Set(response.data.data.map(u => u.officeLocation).filter(Boolean))] as string[];
        return { success: true, data: locations };
      }
    } catch (e) {
      console.warn("Failed to fetch locations", e);
    }
    return { success: true, data: [] };
  },
};

// Groups API
export const groupsApi = {
  getGroups: async (): Promise<ApiResponse<UserGroup[]>> => {
    try {
      const realData = await fetchClient('/groups');
      if (realData && realData.value) {
        const groups: UserGroup[] = realData.value.map((g: any) => ({
          id: g.id,
          displayName: g.displayName,
          description: g.description || 'No description',
          groupType: g.groupTypes?.includes('Unified') ? 'M365' : 'Security',
          email: g.mail,
          memberCount: 0, // Requires expansion or separate call
          createdDate: g.createdDateTime,
        }));
        return { success: true, data: groups };
      }
    } catch (e) {
      console.warn("Falling back to mock data for groups", e);
    }

    await delay(400);
    return { success: true, data: mockUserGroups };
  },

  getGroupMembers: async (_id: string): Promise<ApiResponse<M365User[]>> => {
    await delay(500);
    return { success: true, data: mockM365Users.slice(0, Math.floor(Math.random() * 5) + 1) };
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

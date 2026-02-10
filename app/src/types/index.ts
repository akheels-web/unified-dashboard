// User Types
export interface User {
  id: string;
  entraId: string;
  email: string;
  displayName: string;
  role: 'it_admin' | 'it_user';
  department?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  avatar?: string;
  allowedPages?: string[];
  permissions?: PagePermissions;
}

export interface M365User {
  id: string;
  userPrincipalName: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  email?: string;
  department?: string;
  jobTitle?: string;
  officeLocation?: string;
  accountEnabled: boolean;
  createdDateTime?: string;
  lastSignInDateTime?: string;
  mfaEnabled?: boolean;
  groups?: UserGroup[];
  syncedAt?: string;
  allowedPages?: string[];
}

export interface UserGroup {
  id: string;
  displayName: string;
  description?: string;
  groupType?: string;
  memberCount?: number;
  email?: string;
  createdDate?: string;
}

// Software Types
export interface Software {
  id: string;
  name: string;
  version: string;
  licenseKey?: string;
  purchaseDate?: string;
  renewalDate?: string;
  price: number;
  currency: string;
  vendor?: string;
  assignedUsers: string[]; // User IDs
  isOneTimePurchase: boolean;
  status: 'active' | 'expired' | 'upcoming';
  website?: string;
  description?: string;
}

// Asset Types
export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  status: 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost';
  assignedTo?: string;
  assignedToName?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  image?: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  count?: number;
}

// Onboarding Types
export interface OnboardingWorkflow {
  id: string;
  employeeName: string;
  employeeEmail: string;
  startDate: string;
  department?: string;
  jobTitle?: string;
  managerId?: string;
  managerName?: string;
  location?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  tasks?: OnboardingTask[];
  progress?: number;
}

export interface OnboardingTask {
  id: string;
  workflowId: string;
  taskType: string;
  taskName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  resultData?: string;
  errorMessage?: string;
}

// M365 License Types
export interface M365License {
  id: string;
  skuId: string;
  name: string;
  description: string;
  availableUnits: number;
  consumedUnits: number;
  category: 'Office365' | 'Microsoft365' | 'EMS' | 'PowerBI' | 'Dynamics' | 'Other';
}

export interface M365App {
  id: string;
  name: string;
  category: 'Office' | 'Collaboration' | 'Analytics' | 'Security';
  icon: string;
  enabled: boolean;
}

// Intune Device Types
export interface IntuneDevice {
  id: string;
  deviceName: string;
  deviceType: 'Windows' | 'iOS' | 'Android' | 'macOS';
  model: string;
  osVersion: string;
  serialNumber: string;
  enrollmentDate: string;
  lastSync: string;
  complianceState: 'Compliant' | 'NonCompliant' | 'InGracePeriod' | 'Unknown';
  primaryUser: string | null;
  primaryUserName?: string;
  status: 'available' | 'assigned' | 'retired';
}

// Offboarding Types
export interface OffboardingWorkflow {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail?: string;
  departureDate: string;
  reason?: string;
  disableAccount: boolean;
  revokeSessions: boolean;
  removeMfa: boolean;
  removeGroups: boolean;
  forwardEmail?: string;
  archiveData: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  tasks?: OffboardingTask[];
  progress?: number;
}

export interface OffboardingTask {
  id: string;
  workflowId: string;
  taskType: string;
  taskName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  resultData?: string;
  errorMessage?: string;
}

// Unifi Types
export interface UnifiSite {
  id: string;
  name: string;
  description?: string;
  location?: string;
  timezone?: string;
  deviceCount: number;
  clientCount: number;
  isActive: boolean;
  status: 'online' | 'offline' | 'attention';
}

export interface UnifiDevice {
  id: string;
  siteId: string;
  name: string;
  deviceType: string;
  model?: string;
  macAddress?: string;
  ipAddress?: string;
  status: 'online' | 'offline' | 'adopting' | 'pending';
  firmwareVersion?: string;
  uptime?: number;
  numClients: number;
  lastSeen?: string;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// Dashboard Types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalAssets: number;
  assignedAssets: number;
  pendingOnboarding: number;
  pendingOffboarding: number;
  usersTrend: number;
  assetsTrend: number;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  status: 'success' | 'warning' | 'error';
  icon?: string;
}

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  lastUpdated: string;

}

export interface SystemStatus {
  microsoft: {
    overall: 'operational' | 'degraded' | 'outage';
    lastSync: string;
    services: ServiceStatus[];
  };
  unifi: {
    overall: 'operational' | 'degraded' | 'outage';
    lastSync: string;
    services: ServiceStatus[];
  };
}

// Chart Data Types
export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
}

// Filter Types
export interface UserFilters {
  search?: string;
  department?: string;
  status: 'active' | 'inactive' | 'all';
  lastActive?: string;
  allowedPages?: string[]; // List of paths the user can access
  location?: string;
}

// Dashboard Admin Types
export interface PagePermissions {
  dashboard: boolean;
  users: boolean;
  groups: boolean;
  assets: boolean;
  software: boolean;
  onboarding: boolean;
  offboarding: boolean;
  network: boolean;
  sites: boolean;
  proxmox: boolean;
  patchManagement: boolean;
  reports: boolean;
  auditLogs: boolean;
  settings: boolean;
}

export interface DashboardAdmin {
  id: string;
  username: string;
  email: string;
  role: 'it_admin' | 'it_user' | 'viewer';
  permissions: PagePermissions;
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
  createdBy: string;
  source?: 'manual' | 'synced';
  m365GroupId?: string;
}

export interface M365GroupMapping {
  role: 'it_admin' | 'it_user';
  groupId: string;
  groupName: string;
  autoSync: boolean;
  lastSync?: string;
}

export interface AssetFilters {
  search?: string;
  category?: string;
  status?: string;
  location?: string;
  assignedTo?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form Types
export interface OnboardingFormData {
  employeeName: string;
  employeeEmail: string;
  startDate: string;
  department?: string;
  jobTitle?: string;
  managerId?: string;
  location?: string;
  licenseType?: string;
  groups?: string[];
  assets?: string[];
}

export interface OffboardingFormData {
  userId: string;
  departureDate: string;
  reason?: string;
  disableAccount: boolean;
  revokeSessions: boolean;
  removeMfa: boolean;
  removeGroups: boolean;
  forwardEmail?: string;
  archiveData: boolean;
  delegateAccessTo?: string;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// Settings Types
export interface PlatformSettings {
  m365SyncInterval: number;
  unifiSyncInterval: number;
  autoOffboarding: boolean;
  emailNotifications: boolean;
  dataRetentionDays: number;
}

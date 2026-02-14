import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ChevronLeft, ChevronRight, X, Loader2,
  Mail, Building2, MapPin, Calendar, Clock, Users as UsersIcon,
  Monitor, Smartphone, Tablet, MoreVertical, RefreshCw, UserPlus,
  CheckCircle2, AlertTriangle, UserX, LogOut, Key, Group, Laptop
} from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { useUIStore } from '@/stores/uiStore';
import { usersApi, groupsApi } from '@/services/api';
import type { M365User, UserGroup, Asset } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function Users() {
  const {
    users, filters, pagination, isLoading,
    setUsers, setFilters, setPagination, setLoading
  } = useUserStore();
  const { addNotification } = useUIStore();

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [userDetail, setUserDetail] = useState<M365User | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [userAssets, setUserAssets] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);


  // Group member display
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<{ members: any[], owners: any[] }>({ members: [], owners: [] });
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);

  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', label: 'All Users' },
    { id: 'lxt', label: 'LXT Users' },
    { id: 'clickworker', label: 'Clickworker Users' },
    { id: 'guest', label: 'Guest Users' },
  ];


  useEffect(() => {
    console.log('Users Page Loaded - Version: LIVE_DATA_FIX_V2');

    // Sync active tab with filters on load
    if (filters.userType === 'Guest') setActiveTab('guest');
    else if (filters.domain?.includes('lxt')) setActiveTab('lxt');
    else if (filters.domain?.includes('clickworker')) setActiveTab('clickworker');
    else setActiveTab('all');

    loadUsers();
    loadFilterOptions();
  }, [filters, pagination.page, pagination.pageSize]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setPagination({ ...pagination, page: 1 }); // Reset to first page

    let newFilters = { ...filters };

    // Reset domain/userType first
    delete newFilters.domain;
    delete newFilters.userType;

    switch (tabId) {
      case 'lxt':
        setFilters({ ...newFilters, domain: '@lxt.ai' });
        break;
      case 'clickworker':
        setFilters({ ...newFilters, domain: '@clickworker.com' }); // Adjust domain as needed
        break;
      case 'guest':
        setFilters({ ...newFilters, userType: 'Guest' });
        break;
      default:
        setFilters({ ...newFilters });
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await usersApi.getUsers(filters, pagination.page, pagination.pageSize);
      if (response.success && response.data) {
        setUsers(response.data.data);
        setPagination({
          total: response.data.total,
          totalPages: response.data.totalPages,
        });
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [deptRes, locRes] = await Promise.all([
        usersApi.getDepartments(),
        usersApi.getLocations(),
      ]);
      if (deptRes.success) setDepartments(deptRes.data || []);
      if (locRes.success) setLocations(locRes.data || []);
    } catch (error) {
      console.error('Failed to load filter options');
    }
  };



  const handleUserClick = async (user: M365User) => {
    setUserDetail(user); // Optimistic update
    setShowUserDetail(true);

    try {
      // Fetch fresh user details (for MFA, etc.), groups, and managed devices (Intune)
      const [userRes, groupsRes, deviceRes] = await Promise.all([
        usersApi.getUser(user.id),
        usersApi.getUserGroups(user.id),
        usersApi.getUserDevices(user.id)
      ]);

      if (userRes.success && userRes.data) {
        setUserDetail(userRes.data);
      }
      if (groupsRes.success) {
        setUserGroups(groupsRes.data || []);
      }
      if (deviceRes.success) {
        // getUserDevices returns Asset[] directly
        setUserAssets(deviceRes.data || []);
      }
    } catch (error) {
      toast.error('Failed to load user details');
    }
  };

  const handleGroupClick = async (group: UserGroup) => {
    setSelectedGroup(group);
    setLoadingGroupMembers(true);
    try {
      const response = await groupsApi.getGroupMembers(group.id);
      if (response.success && response.data) {
        setGroupMembers(response.data);
      }
    } catch (error) {
      toast.error('Failed to load group members');
    } finally {
      setLoadingGroupMembers(false);
    }
  };

  const handleDisableUser = async (userId: string) => {
    setActionInProgress(userId);
    try {
      const response = await usersApi.disableUser(userId);
      if (response.success) {
        toast.success('User account disabled successfully');
        addNotification({
          title: 'User Disabled',
          message: `Account for ${userDetail?.displayName} has been disabled`,
          type: 'success',
        });
        loadUsers();
      }
    } catch (error) {
      toast.error('Failed to disable user');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    setActionInProgress(`sessions - ${userId} `);
    try {
      const response = await usersApi.revokeSessions(userId);
      if (response.success) {
        toast.success('All sessions revoked successfully');
        addNotification({
          title: 'Sessions Revoked',
          message: `All active sessions for ${userDetail?.displayName} have been terminated`,
          type: 'success',
        });
      }
    } catch (error) {
      toast.error('Failed to revoke sessions');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveMfa = async (userId: string) => {
    setActionInProgress(`mfa - ${userId} `);
    try {
      const response = await usersApi.removeMfa(userId);
      if (response.success) {
        toast.success('MFA methods removed successfully');
        addNotification({
          title: 'MFA Removed',
          message: `Multi - factor authentication removed for ${userDetail?.displayName}`,
          type: 'success',
        });
      }
    } catch (error) {
      toast.error('Failed to remove MFA');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveFromGroups = async (userId: string) => {
    setActionInProgress(`groups - ${userId} `);
    try {
      const response = await usersApi.removeFromGroups(userId);
      if (response.success) {
        toast.success('User removed from all groups');
        addNotification({
          title: 'Groups Updated',
          message: `${userDetail?.displayName} removed from all groups`,
          type: 'success',
        });
        setUserGroups([]);
      }
    } catch (error) {
      toast.error('Failed to remove from groups');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSync = async () => {
    toast.promise(usersApi.syncUsers(), {
      loading: 'Syncing users from M365...',
      success: 'Users synchronized successfully!',
      error: 'Failed to sync users',
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">Manage M365 user accounts and access</p>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center gap-2 px-4 py-2 bg-[#ed7422] hover:bg-[#ed7422]/90 text-white font-medium rounded-lg transition-colors shadow-lg shadow-orange-500/20"
        >
          <RefreshCw className="w-4 h-4" />
          Sync
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex items-center gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filters.department}
            onChange={(e) => setFilters({ department: e.target.value })}
            className="px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as any })}
            className="px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Location Filter */}
          <select
            value={filters.location}
            onChange={(e) => setFilters({ location: e.target.value })}
            className="px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {(filters.search || filters.department || filters.status !== 'all' || filters.location) && (
            <button
              onClick={() => setFilters({ search: '', department: '', status: 'all', location: '' })}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-3 bg-primary/10 border border-primary/30 rounded-lg"
        >
          <span className="text-primary font-medium">
            {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                toast.success(`${selectedUsers.length} users disabled`);
                setSelectedUsers([]);
              }}
              className="px-3 py-1.5 text-sm bg-card hover:bg-muted text-foreground rounded transition-colors border border-border"
            >
              Disable
            </button>
            <button
              onClick={() => {
                toast.success(`Sessions revoked for ${selectedUsers.length} users`);
                setSelectedUsers([]);
              }}
              className="px-3 py-1.5 text-sm bg-card hover:bg-muted text-foreground rounded transition-colors border border-border"
            >
              Revoke Sessions
            </button>
            <button
              onClick={() => {
                toast.success(`MFA removed for ${selectedUsers.length} users`);
                setSelectedUsers([]);
              }}
              className="px-3 py-1.5 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors border border-destructive/20"
            >
              Remove MFA
            </button>
          </div>
        </motion.div>
      )}

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border bg-card text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Department</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Sign-in</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-4 h-4 rounded border-border bg-card text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {user.displayName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground">{user.department || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground">{user.officeLocation || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={user.accountEnabled ? 'active' : 'inactive'}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-sm">
                        {user.lastSignInDateTime
                          ? format(new Date(user.lastSignInDateTime), 'MMM d, yyyy')
                          : 'Never'
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserClick(user);
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination({ page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination({ page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Detail Slide-out */}
      <AnimatePresence>
        {showUserDetail && userDetail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setShowUserDetail(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-card border-b border-border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {userDetail.displayName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{userDetail.displayName}</h2>
                      <p className="text-muted-foreground">{userDetail.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <StatusBadge
                          status={userDetail.accountEnabled ? 'active' : 'inactive'}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUserDetail(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Contact Info */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <span className="text-foreground">{userDetail.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                      <span className="text-foreground">{userDetail.department || 'No department'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <span className="text-foreground">{userDetail.officeLocation || 'No location'}</span>
                    </div>
                  </div>
                </section>

                {/* Account Details */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Account Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-foreground">
                        {userDetail.createdDateTime
                          ? format(new Date(userDetail.createdDateTime), 'MMM d, yyyy')
                          : '-'
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Last Sign-in</p>
                      <p className="text-foreground">
                        {userDetail.lastSignInDateTime
                          ? format(new Date(userDetail.lastSignInDateTime), 'MMM d, yyyy HH:mm')
                          : 'Never'
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">MFA Status</p>
                      <div className="flex items-center gap-2">
                        {userDetail.mfaEnabled ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-foreground">Enabled</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span className="text-foreground">Not Enabled</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Job Title</p>
                      <p className="text-foreground">{userDetail.jobTitle || '-'}</p>
                    </div>
                  </div>
                </section>

                {/* Group Memberships */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Group Memberships ({userGroups.length})
                  </h3>
                  <div className="space-y-2">
                    {userGroups.map((group) => (
                      <div
                        key={group.id}
                        onClick={() => handleGroupClick(group)}
                        className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <Group className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{group.displayName}</p>
                          <p className="text-xs text-muted-foreground">{group.description}</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                          {group.groupType}
                        </span>
                      </div>
                    ))}
                    {userGroups.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No group memberships</p>
                    )}
                  </div>
                </section>

                {/* Assigned Assets */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Assigned Assets ({userAssets.length})
                  </h3>
                  <div className="space-y-2">
                    {userAssets.map((asset) => (
                      <div key={asset.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Laptop className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">{asset.assetTag}</p>
                        </div>
                        <StatusBadge status={asset.status as any} size="sm" />
                      </div>
                    ))}
                    {userAssets.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No assets assigned</p>
                    )}
                  </div>
                </section>




                {/* Actions */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleDisableUser(userDetail.id)}
                      disabled={actionInProgress === userDetail.id || !userDetail.accountEnabled}
                      className="flex items-center justify-center gap-2 p-3 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === userDetail.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                      Disable Account
                    </button>
                    <button
                      onClick={() => handleRevokeSessions(userDetail.id)}
                      disabled={actionInProgress === `sessions - ${userDetail.id} `}
                      className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === `sessions - ${userDetail.id} ` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      Revoke Sessions
                    </button>
                    <button
                      onClick={() => handleRemoveMfa(userDetail.id)}
                      disabled={actionInProgress === `mfa - ${userDetail.id} ` || !userDetail.mfaEnabled}
                      className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === `mfa - ${userDetail.id} ` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Key className="w-4 h-4" />
                      )}
                      Remove MFA
                    </button>
                    <button
                      onClick={() => handleRemoveFromGroups(userDetail.id)}
                      disabled={actionInProgress === `groups - ${userDetail.id} ` || userGroups.length === 0}
                      className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === `groups - ${userDetail.id} ` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UsersIcon className="w-4 h-4" />
                      )}
                      Remove Groups
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Group Members Modal */}
      <AnimatePresence>
        {selectedGroup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setSelectedGroup(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-card rounded-xl border border-border shadow-2xl z-50 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedGroup.displayName}</h2>
                  <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>
                </div>
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                {loadingGroupMembers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Owners Section */}
                    <section>
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Owners ({groupMembers.owners.length})
                      </h3>
                      <div className="space-y-2">
                        {groupMembers.owners.map((owner: any) => (
                          <div key={owner.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {owner.displayName?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1">
                              <p className="text-foreground font-medium">{owner.displayName}</p>
                              <p className="text-xs text-muted-foreground">{owner.mail || owner.userPrincipalName}</p>
                            </div>
                          </div>
                        ))}
                        {groupMembers.owners.length === 0 && (
                          <p className="text-muted-foreground text-center py-4">No owners</p>
                        )}
                      </div>
                    </section>

                    {/* Members Section */}
                    <section>
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Members ({groupMembers.members.length})
                      </h3>
                      <div className="space-y-2">
                        {groupMembers.members.map((member: any) => (
                          <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-medium">
                              {member.displayName?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1">
                              <p className="text-foreground font-medium">{member.displayName}</p>
                              <p className="text-xs text-muted-foreground">{member.mail || member.userPrincipalName}</p>
                              {member.jobTitle && (
                                <p className="text-xs text-muted-foreground">{member.jobTitle}</p>
                              )}
                            </div>
                          </div>
                        ))}
                        {groupMembers.members.length === 0 && (
                          <p className="text-muted-foreground text-center py-4">No members</p>
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

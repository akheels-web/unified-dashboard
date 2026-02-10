import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MoreVertical, RefreshCw, UserX, UserPlus,
  Key, Users as UsersIcon, LogOut, Mail, Building2, MapPin,
  ChevronLeft, ChevronRight, X, CheckCircle2, AlertTriangle,
  Loader2, Shield, ShieldOff, Group
} from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { useUIStore } from '@/stores/uiStore';
import { usersApi } from '@/services/api';
import type { M365User, UserGroup } from '@/types';
import { navItems } from '@/config/navigation';
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
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userAllowedPages, setUserAllowedPages] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
    loadFilterOptions();
  }, [filters, pagination.page, pagination.pageSize]);

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

  const handleSaveAccess = async () => {
    if (!userDetail) return;
    setActionInProgress('save-access');
    try {
      const response = await usersApi.updateUserAccess(userDetail.id, userAllowedPages);
      if (response.success) {
        toast.success('User access updated successfully');
        // Update local state
        setUserDetail(prev => prev ? { ...prev, allowedPages: userAllowedPages } : null);
        // Update list state
        setUsers(users.map(u => u.id === userDetail.id ? { ...u, allowedPages: userAllowedPages } : u));
      }
    } catch (error) {
      toast.error('Failed to update user access');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUserClick = async (user: M365User) => {
    setUserDetail(user);
    setUserAllowedPages(user.allowedPages || []);
    setShowUserDetail(true);
    try {
      const groupsRes = await usersApi.getUserGroups(user.id);
      if (groupsRes.success) {
        setUserGroups(groupsRes.data || []);
      }
    } catch (error) {
      toast.error('Failed to load user groups');
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
    setActionInProgress(`sessions-${userId}`);
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
    setActionInProgress(`mfa-${userId}`);
    try {
      const response = await usersApi.removeMfa(userId);
      if (response.success) {
        toast.success('MFA methods removed successfully');
        addNotification({
          title: 'MFA Removed',
          message: `Multi-factor authentication removed for ${userDetail?.displayName}`,
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
    setActionInProgress(`groups-${userId}`);
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted text-foreground rounded-lg transition-colors border border-border"
          >
            <RefreshCw className="w-4 h-4" />
            Sync
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed7422] hover:bg-[#ed7422]/90 text-white font-medium rounded-lg transition-colors shadow-lg shadow-orange-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
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
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">MFA</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
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
                    <td className="px-4 py-3">
                      {user.mfaEnabled ? (
                        <Shield className="w-5 h-5 text-green-500" />
                      ) : (
                        <ShieldOff className="w-5 h-5 text-muted-foreground" />
                      )}
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
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Group Memberships ({userGroups.length})
                  </h3>
                  <div className="space-y-2">
                    {userGroups.map((group) => (
                      <div key={group.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                        <Group className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{group.displayName}</p>
                          <p className="text-xs text-muted-foreground">{group.description}</p>
                        </div>
                      </div>
                    ))}
                    {userGroups.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No group memberships</p>
                    )}
                  </div>
                </section>

                {/* Access Control */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Page Access Control
                  </h3>
                  <div className="bg-muted/20 rounded-lg p-4 space-y-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Select the pages this user is allowed to access. If no pages are selected, default role-based access applies.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {navItems.map((item) => (
                        <label key={item.path} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-border bg-card text-primary focus:ring-primary"
                            checked={
                              // If allowedPages is empty/undefined, it means "Default Access" (all role-allowed pages)
                              // But for UI editing, we want to show what is explicitly allowed.
                              // If we want to ENABLE granular access, we should probably start with CURRENT access or empty?
                              // If empty, functionality defaults to roles.
                              // If we want to restrict, we select specific pages.
                              // Let's assume if array is empty, we show all unchecked (Default Mode).
                              // If we check one, we enter Granular Mode.
                              (userAllowedPages?.includes(item.path)) || false
                            }
                            onChange={(e) => {
                              const path = item.path;
                              let newPages = [...(userAllowedPages || [])];
                              if (e.target.checked) {
                                newPages.push(path);
                              } else {
                                newPages = newPages.filter(p => p !== path);
                              }
                              setUserAllowedPages(newPages);
                            }}
                          />
                          <span className="text-sm text-foreground">{item.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSaveAccess}
                        disabled={actionInProgress === 'save-access'}
                        className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {actionInProgress === 'save-access' ? 'Saving...' : 'Save Access'}
                      </button>
                    </div>
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
                      disabled={actionInProgress === `sessions-${userDetail.id}`}
                      className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === `sessions-${userDetail.id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      Revoke Sessions
                    </button>
                    <button
                      onClick={() => handleRemoveMfa(userDetail.id)}
                      disabled={actionInProgress === `mfa-${userDetail.id}` || !userDetail.mfaEnabled}
                      className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === `mfa-${userDetail.id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Key className="w-4 h-4" />
                      )}
                      Remove MFA
                    </button>
                    <button
                      onClick={() => handleRemoveFromGroups(userDetail.id)}
                      disabled={actionInProgress === `groups-${userDetail.id}` || userGroups.length === 0}
                      className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === `groups-${userDetail.id}` ? (
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
      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Add New User</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Display Name</label>
                    <input type="text" className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                    <input type="email" className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary" placeholder="john.doe@company.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Department</label>
                    <select className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary">
                      {departments.map(d => <option key={d} value={d} className="bg-card text-foreground">{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3">
                  <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={() => {
                    toast.success('User invite sent successfully');
                    setShowAddModal(false);
                    loadUsers();
                  }} className="px-4 py-2 bg-[#ed7422] hover:bg-[#ed7422]/90 text-white font-medium rounded-lg shadow-md transition-colors">
                    Add User
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

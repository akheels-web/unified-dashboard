import { useEffect, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MoreVertical, Search,
  ChevronRight, ChevronLeft, Check, User, AlertTriangle,
  LogOut, Key, Users, Archive,
  X, Loader2, CheckCircle2, ShieldOff,
  Laptop, Trash2, Triangle, Filter
} from 'lucide-react';

// Alias Triangle as ExclamationTriangle since lucide doesn't have ExclamationTriangle
const ExclamationTriangle = Triangle;
import { offboardingApi, usersApi } from '@/services/api';
import type { OffboardingWorkflow, M365User } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const offboardingSteps = [
  { id: 'select', label: 'Select Employee', icon: User },
  { id: 'account', label: 'Account Actions', icon: ShieldOff },
  { id: 'data', label: 'Data Management', icon: Archive },
  { id: 'assets', label: 'Asset Recovery', icon: Laptop },
  { id: 'confirm', label: 'Confirm', icon: CheckCircle2 },
];

export function Offboarding() {
  const [workflows, setWorkflows] = useState<OffboardingWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeUsers, setActiveUsers] = useState<M365User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowSearchQuery, setWorkflowSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isExecuting, setIsExecuting] = useState(false);

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.employeeName.toLowerCase().includes(workflowSearchQuery.toLowerCase()) ||
      workflow.employeeEmail?.toLowerCase().includes(workflowSearchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Form data
  const [formData, setFormData] = useState({
    userId: '',
    employeeName: '',
    employeeEmail: '',
    departureDate: '',
    reason: '',
    disableAccount: true,
    revokeSessions: true,
    removeMfa: true,
    removeGroups: true,
    forwardEmail: '',
    archiveData: true,
    delegateAccessTo: '',
  });

  const [userAssets, setUserAssets] = useState<any[]>([]);

  useEffect(() => {
    loadWorkflows();
    loadActiveUsers();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const response = await offboardingApi.getWorkflows();
      if (response.success) {
        setWorkflows(response.data || []);
      }
    } catch (error) {
      toast.error('Failed to load offboarding workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveUsers = async () => {
    try {
      const response = await usersApi.getUsers({ status: 'active' }, 1, 100);
      if (response.success && response.data) {
        setActiveUsers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load active users');
    }
  };

  const handleStartNew = () => {
    setShowNewModal(true);
    setCurrentStep(0);
    setFormData({
      userId: '',
      employeeName: '',
      employeeEmail: '',
      departureDate: '',
      reason: '',
      disableAccount: true,
      revokeSessions: true,
      removeMfa: true,
      removeGroups: true,
      forwardEmail: '',
      archiveData: true,
      delegateAccessTo: '',
    });
  };

  const handleUserSelect = (user: M365User) => {
    setFormData({
      ...formData,
      userId: user.id,
      employeeName: user.displayName,
      employeeEmail: user.email || user.userPrincipalName,
    });
    // Mock loading user assets
    setUserAssets([
      { id: '1', name: 'MacBook Pro 16"', assetTag: 'LAPTOP-001', status: 'assigned' },
      { id: '2', name: 'iPhone 15 Pro', assetTag: 'PHONE-001', status: 'assigned' },
      { id: '3', name: 'Dell UltraSharp 27"', assetTag: 'MONITOR-001', status: 'assigned' },
    ]);
    setCurrentStep(1);
  };

  const handleNext = () => {
    if (currentStep < offboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsExecuting(true);
    try {
      const response = await offboardingApi.createWorkflow(formData);
      if (response.success) {
        toast.success('Offboarding workflow created successfully');

        // Execute the workflow
        if (response.data?.id) {
          await offboardingApi.executeWorkflow(response.data.id);
          toast.success('Offboarding process executed');
        }

        setShowNewModal(false);
        loadWorkflows();
      }
    } catch (error) {
      toast.error('Failed to create offboarding workflow');
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredUsers = activeUsers.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Select Employee
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                    formData.userId === user.id
                      ? 'bg-primary/20 border border-primary'
                      : 'bg-muted/20 hover:bg-muted'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {user.displayName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground font-medium">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.department} • {user.jobTitle}</p>
                  </div>
                  {formData.userId === user.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 1: // Account Actions
        return (
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
              <ExclamationTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-destructive font-medium">Warning: Destructive Actions</p>
                <p className="text-sm text-muted-foreground">
                  The following actions will immediately affect the user account. These cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Disable Account */}
              <label className={cn(
                'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
                formData.disableAccount
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-muted/20 border-border'
              )}>
                <input
                  type="checkbox"
                  checked={formData.disableAccount}
                  onChange={(e) => setFormData({ ...formData, disableAccount: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-card text-destructive focus:ring-destructive"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground font-medium">Disable Account</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Prevent user from signing in</p>
                </div>
              </label>

              {/* Revoke Sessions */}
              <label className={cn(
                'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
                formData.revokeSessions
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-muted/20 border-border'
              )}>
                <input
                  type="checkbox"
                  checked={formData.revokeSessions}
                  onChange={(e) => setFormData({ ...formData, revokeSessions: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-card text-destructive focus:ring-destructive"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <LogOut className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground font-medium">Revoke All Sessions</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Sign out from all devices immediately</p>
                </div>
              </label>

              {/* Remove MFA */}
              <label className={cn(
                'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
                formData.removeMfa
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-muted/20 border-border'
              )}>
                <input
                  type="checkbox"
                  checked={formData.removeMfa}
                  onChange={(e) => setFormData({ ...formData, removeMfa: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-card text-destructive focus:ring-destructive"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground font-medium">Remove MFA Methods</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Delete all authentication methods</p>
                </div>
              </label>

              {/* Remove Groups */}
              <label className={cn(
                'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
                formData.removeGroups
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-muted/20 border-border'
              )}>
                <input
                  type="checkbox"
                  checked={formData.removeGroups}
                  onChange={(e) => setFormData({ ...formData, removeGroups: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-card text-destructive focus:ring-destructive"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground font-medium">Remove from All Groups</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Remove from security groups, distribution lists, etc.</p>
                </div>
              </label>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Departure Date</label>
              <input
                type="date"
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Reason</label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="" className="bg-card text-foreground">Select Reason</option>
                <option value="Resigned" className="bg-card text-foreground">Resigned</option>
                <option value="Terminated" className="bg-card text-foreground">Terminated</option>
                <option value="Retired" className="bg-card text-foreground">Retired</option>
                <option value="Contract Ended" className="bg-card text-foreground">Contract Ended</option>
                <option value="Other" className="bg-card text-foreground">Other</option>
              </select>
            </div>
          </div>
        );

      case 2: // Data Management
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Email Forwarding</label>
              <input
                type="email"
                placeholder="Forward emails to..."
                value={formData.forwardEmail}
                onChange={(e) => setFormData({ ...formData, forwardEmail: e.target.value })}
                className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to disable email forwarding
              </p>
            </div>

            <label className={cn(
              'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
              formData.archiveData
                ? 'bg-primary/10 border-primary/30'
                : 'bg-muted/20 border-border'
            )}>
              <input
                type="checkbox"
                checked={formData.archiveData}
                onChange={(e) => setFormData({ ...formData, archiveData: e.target.checked })}
                className="w-5 h-5 rounded border-border bg-card text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground font-medium">Archive User Data</span>
                </div>
                <p className="text-sm text-muted-foreground">Save emails, OneDrive files, and SharePoint data</p>
              </div>
            </label>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Delegate Access To</label>
              <select
                value={formData.delegateAccessTo}
                onChange={(e) => setFormData({ ...formData, delegateAccessTo: e.target.value })}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="" className="bg-card text-foreground">Select User</option>
                {activeUsers.filter(u => u.id !== formData.userId).map((user) => (
                  <option key={user.id} value={user.id} className="bg-card text-foreground">
                    {user.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 3: // Asset Recovery
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Assets currently assigned to {formData.employeeName}:</p>

            <div className="space-y-2">
              {userAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg"
                >
                  <Laptop className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-foreground font-medium">{asset.name}</p>
                    <p className="text-sm text-muted-foreground">{asset.assetTag}</p>
                  </div>
                  <StatusBadge status="assigned" size="sm" />
                </div>
              ))}
            </div>

            {userAssets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Laptop className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No assets assigned to this user</p>
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-500 text-sm">
                <strong>Note:</strong> Asset recovery tasks will be created. The IT team will be notified to collect the equipment.
              </p>
            </div>
          </div>
        );

      case 4: // Confirm
        return (
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <h4 className="text-destructive font-medium">Final Confirmation</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                You are about to offboard <strong className="text-foreground">{formData.employeeName}</strong>.
                This will execute the following actions:
              </p>
            </div>

            <div className="bg-muted/20 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-foreground mb-3">Actions to be executed:</h4>

              {formData.disableAccount && (
                <div className="flex items-center gap-2 text-destructive">
                  <X className="w-4 h-4" />
                  <span>Disable user account</span>
                </div>
              )}
              {formData.revokeSessions && (
                <div className="flex items-center gap-2 text-destructive">
                  <LogOut className="w-4 h-4" />
                  <span>Revoke all active sessions</span>
                </div>
              )}
              {formData.removeMfa && (
                <div className="flex items-center gap-2 text-destructive">
                  <Key className="w-4 h-4" />
                  <span>Remove all MFA methods</span>
                </div>
              )}
              {formData.removeGroups && (
                <div className="flex items-center gap-2 text-destructive">
                  <Users className="w-4 h-4" />
                  <span>Remove from all groups</span>
                </div>
              )}
              {formData.archiveData && (
                <div className="flex items-center gap-2 text-green-500">
                  <Archive className="w-4 h-4" />
                  <span>Archive user data</span>
                </div>
              )}
              {userAssets.length > 0 && (
                <div className="flex items-center gap-2 text-yellow-500">
                  <Laptop className="w-4 h-4" />
                  <span>Recover {userAssets.length} assets</span>
                </div>
              )}
            </div>

            <div className="bg-muted/20 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Employee Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="text-foreground">{formData.employeeName}</span>
                <span className="text-muted-foreground">Email:</span>
                <span className="text-foreground">{formData.employeeEmail}</span>
                <span className="text-muted-foreground">Departure Date:</span>
                <span className="text-foreground">{formData.departureDate}</span>
                <span className="text-muted-foreground">Reason:</span>
                <span className="text-foreground">{formData.reason}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Offboarding</h1>
          <p className="text-muted-foreground">Manage employee offboarding and account termination</p>
        </div>
        <button
          onClick={handleStartNew}
          className="flex items-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Offboarding
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-foreground">{workflows.length}</p>
          <p className="text-sm text-muted-foreground">Total Workflows</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-yellow-500">
            {workflows.filter(w => w.status === 'pending').length}
          </p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-blue-500">
            {workflows.filter(w => w.status === 'in_progress').length}
          </p>
          <p className="text-sm text-muted-foreground">In Progress</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-bold text-green-500">
            {workflows.filter(w => w.status === 'completed').length}
          </p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={workflowSearchQuery}
            onChange={(e) => setWorkflowSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Workflows List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Employee</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Departure Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Reason</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Progress</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            ) : filteredWorkflows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No offboarding workflows found
                </td>
              </tr>
            ) : (
              filteredWorkflows.map((workflow) => (
                <tr key={workflow.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {workflow.employeeName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-foreground font-medium">{workflow.employeeName}</p>
                        <p className="text-sm text-muted-foreground">{workflow.employeeEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground">
                      {format(new Date(workflow.departureDate), 'MMM d, yyyy')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-foreground">{workflow.reason}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={workflow.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-destructive rounded-full transition-all"
                          style={{ width: `${workflow.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{workflow.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Offboarding Modal */}
      <AnimatePresence>
        {showNewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => !isExecuting && setShowNewModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
                {/* Modal Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-foreground">New Offboarding</h2>
                    {!isExecuting && (
                      <button
                        onClick={() => setShowNewModal(false)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Stepper */}
                  <div className="flex items-center justify-between">
                    {offboardingSteps.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = index === currentStep;
                      const isCompleted = index < currentStep;

                      return (
                        <div key={step.id} className="flex items-center">
                          <div className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                            isActive && 'bg-destructive/10',
                            isCompleted && 'text-destructive'
                          )}>
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center',
                              isActive ? 'bg-destructive text-destructive-foreground' :
                                isCompleted ? 'bg-destructive text-destructive-foreground' :
                                  'bg-muted text-muted-foreground'
                            )}>
                              {isCompleted ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Icon className="w-4 h-4" />
                              )}
                            </div>
                            <span className={cn(
                              'text-sm font-medium hidden sm:block',
                              isActive ? 'text-foreground' : 'text-muted-foreground'
                            )}>
                              {step.label}
                            </span>
                          </div>
                          {index < offboardingSteps.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-muted mx-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {isExecuting ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 border-4 border-muted rounded-full" />
                        <div className="absolute inset-0 border-4 border-destructive rounded-full border-t-transparent animate-spin" />
                      </div>
                      <p className="text-foreground font-medium">Executing offboarding...</p>
                      <p className="text-sm text-muted-foreground">This may take a few moments</p>
                    </div>
                  ) : (
                    renderStepContent()
                  )}
                </div>

                {/* Modal Footer */}
                {!isExecuting && (
                  <div className="p-6 border-t border-border flex items-center justify-between bg-card">
                    <button
                      onClick={handleBack}
                      disabled={currentStep === 0}
                      className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>

                    {currentStep < offboardingSteps.length - 1 ? (
                      <button
                        onClick={handleNext}
                        disabled={currentStep === 0 && !formData.userId}
                        className="flex items-center gap-2 px-6 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-6 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Execute Offboarding
                      </button>
                    )}
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

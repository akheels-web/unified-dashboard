import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MoreVertical, ChevronRight, ChevronLeft, Check, User,
  Laptop, Users, Shield, X, Loader2, CheckCircle2,
  Search, Filter, Copy, Eye, EyeOff, Smartphone,
  MapPin, Building2, Phone, Mail, Key, Zap
} from 'lucide-react';
import { onboardingApi, usersApi } from '@/services/api';
import type { OnboardingWorkflow, M365User, M365License, M365App, IntuneDevice, UserGroup } from '@/types';
import { mockM365Licenses, mockM365Apps, mockIntuneDevices, mockUserGroups } from '@/services/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn, generateSecurePassword, copyToClipboard } from '@/lib/utils';

const steps = [
  { id: 'employee', label: 'Employee Info', icon: User },
  { id: 'account', label: 'Account & License', icon: Shield },
  { id: 'groups', label: 'Groups & Manager', icon: Users },
  { id: 'device', label: 'Device Assignment', icon: Laptop },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
];

export function Onboarding() {
  const [workflows, setWorkflows] = useState<OnboardingWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Available data
  const [managers, setManagers] = useState<M365User[]>([]);
  const [licenses] = useState<M365License[]>(mockM365Licenses);
  const [apps, setApps] = useState<M365App[]>(mockM365Apps);
  const [devices] = useState<IntuneDevice[]>(mockIntuneDevices);
  const [groups] = useState<UserGroup[]>(mockUserGroups);

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.employeeEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Enhanced form data
  const [formData, setFormData] = useState({
    // Basic Info
    employeeName: '',
    givenName: '',
    surname: '',
    employeeEmail: '',
    startDate: '',
    department: '',
    jobTitle: '',

    // Contact Info
    mobilePhone: '',
    businessPhone: '',

    // Location Info
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    officeLocation: '',

    // Organizational
    employeeId: '',
    costCenter: '',
    company: 'Company Inc.',
    managerId: '',

    // Account Settings
    usageLocation: 'US',
    forcePasswordChange: true,
    accountExpiration: '',

    // License & Apps
    licenseId: '',
    selectedApps: [] as string[],

    // Groups & Device
    selectedGroups: [] as string[],
    deviceId: '',
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const response = await onboardingApi.getWorkflows();
      if (response.success) {
        setWorkflows(response.data || []);
      }
    } catch (error) {
      toast.error('Failed to load onboarding workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const usersRes = await usersApi.getUsers({ status: 'active' }, 1, 100);
      if (usersRes.success && usersRes.data) {
        setManagers(usersRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load managers');
    }
  };

  const handleStartNew = () => {
    loadManagers();
    setShowNewModal(true);
    setCurrentStep(0);

    // Reset form with default apps enabled
    const defaultApps = apps.filter(app => app.enabled).map(app => app.id);
    setFormData({
      employeeName: '',
      givenName: '',
      surname: '',
      employeeEmail: '',
      startDate: '',
      department: '',
      jobTitle: '',
      mobilePhone: '',
      businessPhone: '',
      streetAddress: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      officeLocation: '',
      employeeId: '',
      costCenter: '',
      company: 'Company Inc.',
      managerId: '',
      usageLocation: 'US',
      forcePasswordChange: true,
      accountExpiration: '',
      licenseId: licenses[0]?.id || '',
      selectedApps: defaultApps,
      selectedGroups: [],
      deviceId: '',
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // Generate password
      const password = generateSecurePassword(16);
      setGeneratedPassword(password);

      // Create user (in real implementation, this would call the API)
      const response = await onboardingApi.createWorkflow({
        ...formData,
        password,
      });

      if (response.success) {
        toast.success('User created successfully!');
        setShowNewModal(false);
        setShowPasswordModal(true);
        loadWorkflows();
      }
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const toggleApp = (appId: string) => {
    setFormData({
      ...formData,
      selectedApps: formData.selectedApps.includes(appId)
        ? formData.selectedApps.filter(id => id !== appId)
        : [...formData.selectedApps, appId]
    });
  };

  const toggleGroup = (groupId: string) => {
    setFormData({
      ...formData,
      selectedGroups: formData.selectedGroups.includes(groupId)
        ? formData.selectedGroups.filter(id => id !== groupId)
        : [...formData.selectedGroups, groupId]
    });
  };

  const handleCopyPassword = async () => {
    const success = await copyToClipboard(generatedPassword);
    if (success) {
      toast.success('Password copied to clipboard!');
    } else {
      toast.error('Failed to copy password');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Employee Info
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">First Name *</label>
                <input
                  type="text"
                  value={formData.givenName}
                  onChange={(e) => setFormData({ ...formData, givenName: e.target.value, employeeName: `${e.target.value} ${formData.surname}` })}
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Last Name *</label>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value, employeeName: `${formData.givenName} ${e.target.value}` })}
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Email *</label>
                <input
                  type="email"
                  value={formData.employeeEmail}
                  onChange={(e) => setFormData({ ...formData, employeeEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  placeholder="john.doe@company.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Department *</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  placeholder="Engineering"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Job Title *</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  placeholder="Software Engineer"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Mobile Phone</label>
                  <input
                    type="tel"
                    value={formData.mobilePhone}
                    onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Business Phone</label>
                  <input
                    type="tel"
                    value={formData.businessPhone}
                    onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    placeholder="+1 (555) 987-6543"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Street Address</label>
                  <input
                    type="text"
                    value={formData.streetAddress}
                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">State/Province</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    placeholder="10001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    placeholder="United States"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Office Location</label>
                  <input
                    type="text"
                    value={formData.officeLocation}
                    onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    placeholder="New York HQ"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Employee ID</label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    placeholder="EMP-12345"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // Account & License
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Microsoft 365 License
              </h3>
              <div className="space-y-3">
                {licenses.map(license => {
                  const available = license.availableUnits - license.consumedUnits;
                  const isSelected = formData.licenseId === license.id;
                  return (
                    <div
                      key={license.id}
                      onClick={() => setFormData({ ...formData, licenseId: license.id })}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground">{license.name}</h4>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              available > 10
                                ? "bg-green-500/20 text-green-500"
                                : available > 0
                                  ? "bg-yellow-500/20 text-yellow-500"
                                  : "bg-red-500/20 text-red-500"
                            )}>
                              {available} available
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{license.description}</p>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Microsoft 365 Apps
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {apps.map(app => {
                  const isSelected = formData.selectedApps.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      onClick={() => toggleApp(app.id)}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-sm font-medium text-foreground">{app.name}</span>
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Account Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <span className="text-sm text-foreground">Force password change on first login</span>
                  <button
                    onClick={() => setFormData({ ...formData, forcePasswordChange: !formData.forcePasswordChange })}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      formData.forcePasswordChange ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
                      formData.forcePasswordChange ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Usage Location *</label>
                  <select
                    value={formData.usageLocation}
                    onChange={(e) => setFormData({ ...formData, usageLocation: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="SG">Singapore</option>
                    <option value="IN">India</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Groups & Manager
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Manager
              </h3>
              <select
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Select a manager...</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.displayName} - {manager.jobTitle} ({manager.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Security Groups
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {groups.map(group => {
                  const isSelected = formData.selectedGroups.includes(group.id);
                  return (
                    <div
                      key={group.id}
                      onClick={() => toggleGroup(group.id)}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground">{group.displayName}</h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {group.groupType}
                            </span>
                          </div>
                          {group.description && (
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {group.memberCount} members
                          </p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 3: // Device Assignment
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Laptop className="w-4 h-4" />
                Assign Device (Optional)
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a device to assign to this user. The user will be set as the primary user on the device.
              </p>
              <div className="space-y-3">
                <div
                  onClick={() => setFormData({ ...formData, deviceId: '' })}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-all",
                    formData.deviceId === ''
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-sm font-medium text-foreground">No device assignment</span>
                </div>
                {devices.filter(d => d.status === 'available').map(device => {
                  const isSelected = formData.deviceId === device.id;
                  return (
                    <div
                      key={device.id}
                      onClick={() => setFormData({ ...formData, deviceId: device.id })}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-foreground">{device.deviceName}</h4>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              device.deviceType === 'Windows' ? "bg-blue-500/20 text-blue-500" :
                                device.deviceType === 'macOS' ? "bg-gray-500/20 text-gray-500" :
                                  device.deviceType === 'iOS' ? "bg-purple-500/20 text-purple-500" :
                                    "bg-green-500/20 text-green-500"
                            )}>
                              {device.deviceType}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              device.complianceState === 'Compliant' ? "bg-green-500/20 text-green-500" :
                                device.complianceState === 'NonCompliant' ? "bg-red-500/20 text-red-500" :
                                  "bg-yellow-500/20 text-yellow-500"
                            )}>
                              {device.complianceState}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{device.model}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {device.osVersion} • Serial: {device.serialNumber}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 4: // Review
        const selectedLicense = licenses.find(l => l.id === formData.licenseId);
        const selectedAppsData = apps.filter(a => formData.selectedApps.includes(a.id));
        const selectedGroupsData = groups.filter(g => formData.selectedGroups.includes(g.id));
        const selectedDevice = devices.find(d => d.id === formData.deviceId);
        const selectedManager = managers.find(m => m.id === formData.managerId);

        return (
          <div className="space-y-6">
            <div className="bg-muted/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Review User Details</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground">{formData.employeeName}</span></div>
                    <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{formData.employeeEmail}</span></div>
                    <div><span className="text-muted-foreground">Department:</span> <span className="text-foreground">{formData.department}</span></div>
                    <div><span className="text-muted-foreground">Job Title:</span> <span className="text-foreground">{formData.jobTitle}</span></div>
                    <div><span className="text-muted-foreground">Start Date:</span> <span className="text-foreground">{formData.startDate}</span></div>
                    <div><span className="text-muted-foreground">Office:</span> <span className="text-foreground">{formData.officeLocation}</span></div>
                  </div>
                </div>

                {selectedLicense && (
                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">License</h4>
                    <p className="text-sm text-foreground">{selectedLicense.name}</p>
                  </div>
                )}

                {selectedAppsData.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Apps ({selectedAppsData.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAppsData.map(app => (
                        <span key={app.id} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                          {app.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedManager && (
                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Manager</h4>
                    <p className="text-sm text-foreground">{selectedManager.displayName}</p>
                  </div>
                )}

                {selectedGroupsData.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Groups ({selectedGroupsData.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroupsData.map(group => (
                        <span key={group.id} className="text-xs px-2 py-1 bg-muted text-foreground rounded">
                          {group.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDevice && (
                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Device</h4>
                    <p className="text-sm text-foreground">{selectedDevice.deviceName} ({selectedDevice.model})</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Onboarding</h1>
          <p className="text-muted-foreground mt-1">Manage employee onboarding workflows</p>
        </div>
        <button
          onClick={handleStartNew}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Workflows List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No onboarding workflows found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredWorkflows.map(workflow => (
            <motion.div
              key={workflow.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{workflow.employeeName}</h3>
                    <StatusBadge status={workflow.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {workflow.employeeEmail}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      {workflow.department}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      {workflow.jobTitle}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {workflow.location}
                    </div>
                  </div>
                  {workflow.progress !== undefined && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground font-medium">{workflow.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${workflow.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* New User Modal */}
      <AnimatePresence>
        {showNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Create New User</h2>
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;
                    return (
                      <div key={step.id} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            isActive ? "bg-primary text-white" :
                              isCompleted ? "bg-primary/20 text-primary" :
                                "bg-muted text-muted-foreground"
                          )}>
                            {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                          </div>
                          <span className={cn(
                            "text-xs mt-2 font-medium",
                            isActive ? "text-primary" :
                              isCompleted ? "text-primary" :
                                "text-muted-foreground"
                          )}>
                            {step.label}
                          </span>
                        </div>
                        {index < steps.length - 1 && (
                          <div className={cn(
                            "h-0.5 flex-1 mx-2",
                            index < currentStep ? "bg-primary" : "bg-muted"
                          )} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {renderStepContent()}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-border flex justify-between">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                {currentStep === steps.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Create User
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-xl w-full max-w-md p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">User Created Successfully!</h2>
                <p className="text-muted-foreground">Save this password - it will only be shown once</p>
              </div>

              <div className="bg-muted/20 rounded-lg p-4 mb-4">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Generated Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={generatedPassword}
                    readOnly
                    className="flex-1 px-4 py-2 bg-card border border-border rounded-lg text-foreground font-mono"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleCopyPassword}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowPasswordModal(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

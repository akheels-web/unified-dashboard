
import { useState, useEffect } from 'react';
import {
  Shield, Bell,
  Save,
  Palette, Sun, Moon, Key, AlertTriangle, Loader2,
  Settings2, Cloud
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { usePatchStore } from '@/stores/patchStore';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const settingTabs = [
  { id: 'general', name: 'General', icon: Settings2 },
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'integrations', name: 'Integrations', icon: Cloud },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Security', icon: Shield },
];

export function Settings() {
  const { theme, setTheme, brandColor, setBrandColor } = useUIStore();
  const { apiKey: sanerNowKey, setApiKey: setSanerNowKey } = usePatchStore();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'LXT AI',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    language: 'en',
  });

  // Integration settings
  const [integrationSettings, setIntegrationSettings] = useState({
    m365TenantId: '••••••••••••••••',
    m365ClientId: '••••••••••••••••',
    unifiControllerUrl: 'https://unifi.company.com:8443',
    unifiApiKey: '••••••••••••••••',
    sanerNowApiKey: '',
  });

  // Load SanerNow key from store on mount
  useEffect(() => {
    setIntegrationSettings(prev => ({
      ...prev,
      sanerNowApiKey: sanerNowKey || ''
    }));
  }, [sanerNowKey]);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    slackNotifications: false,
    webhookUrl: '',
    notifyOnboarding: true,
    notifyOffboarding: true,
    notifyErrors: true,
    dailyDigest: false,
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    requireMfa: true,
    passwordPolicy: 'strong',
    auditLogRetention: 90,
    ipWhitelist: '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API save
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Save SanerNow key to store
    setSanerNowKey(integrationSettings.sanerNowApiKey);

    toast.success('Settings saved successfully');
    setIsSaving(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={generalSettings.companyName}
                onChange={(e) => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Timezone
                </label>
                <select
                  value={generalSettings.timezone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Date Format
                </label>
                <select
                  value={generalSettings.dateFormat}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-8">
            {/* Theme Selection */}
            <div>
              <h3 className="text-base font-medium text-foreground mb-4">Theme</h3>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all",
                    theme === 'light'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="p-2 rounded-full bg-orange-100 text-orange-500">
                    <Sun className="w-6 h-6" />
                  </div>
                  <span className="font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all",
                    theme === 'dark'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="p-2 rounded-full bg-slate-800 text-slate-100">
                    <Moon className="w-6 h-6" />
                  </div>
                  <span className="font-medium">Dark</span>
                </button>
              </div>
            </div>

            {/* Brand Color Selection */}
            <div>
              <h3 className="text-base font-medium text-foreground mb-4">Brand Color</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: 'Default Blue', value: '196 67% 45%', hex: '#2596be' },
                  { name: 'Royal Purple', value: '262 83% 58%', hex: '#8b5cf6' },
                  { name: 'Emerald Green', value: '142 71% 45%', hex: '#22c55e' },
                  { name: 'Sunset Orange', value: '24 95% 53%', hex: '#f97316' },
                  { name: 'Crimson Red', value: '0 84% 60%', hex: '#ef4444' },
                  { name: 'Slate Gray', value: '215 16% 47%', hex: '#64748b' },
                ].map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setBrandColor(color.value)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                      brandColor === color.value
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div
                      className="w-6 h-6 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm font-medium">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            {/* Microsoft 365 */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-foreground font-medium">Microsoft 365</h4>
                  <p className="text-sm text-muted-foreground">Entra ID integration settings</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Tenant ID</label>
                  <input
                    type="password"
                    value={integrationSettings.m365TenantId}
                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, m365TenantId: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Client ID</label>
                  <input
                    type="password"
                    value={integrationSettings.m365ClientId}
                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, m365ClientId: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* SanerNow */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="text-foreground font-medium">SecPod SanerNow</h4>
                  <p className="text-sm text-muted-foreground">Patch management and vulnerability scanning</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">API Key (SAML Token)</label>
                  <input
                    type="password"
                    value={integrationSettings.sanerNowApiKey}
                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, sanerNowApiKey: e.target.value })}
                    placeholder="Enter your SanerNow API Key"
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* UniFi */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-foreground font-medium">UniFi Controller</h4>
                  <p className="text-sm text-muted-foreground">Network device management</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Controller URL</label>
                  <input
                    type="text"
                    value={integrationSettings.unifiControllerUrl}
                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, unifiControllerUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">API Key</label>
                  <input
                    type="password"
                    value={integrationSettings.unifiApiKey}
                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, unifiApiKey: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.emailNotifications}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-muted/20 text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-foreground font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.slackNotifications}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, slackNotifications: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-muted/20 text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-foreground font-medium">Slack Notifications</p>
                  <p className="text-sm text-muted-foreground">Send notifications to Slack channel</p>
                </div>
              </label>

              {notificationSettings.slackNotifications && (
                <div className="ml-8">
                  <label className="block text-sm text-muted-foreground mb-1">Webhook URL</label>
                  <input
                    type="text"
                    value={notificationSettings.webhookUrl}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, webhookUrl: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.notifyOnboarding}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, notifyOnboarding: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-muted/20 text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-foreground font-medium">Onboarding Alerts</p>
                  <p className="text-sm text-muted-foreground">Notify when onboarding workflows complete</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.notifyOffboarding}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, notifyOffboarding: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-muted/20 text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-foreground font-medium">Offboarding Alerts</p>
                  <p className="text-sm text-muted-foreground">Notify when offboarding workflows complete</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.notifyErrors}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, notifyErrors: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-muted/20 text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-foreground font-medium">Error Notifications</p>
                  <p className="text-sm text-muted-foreground">Notify on workflow errors and failures</p>
                </div>
              </label>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium">Security Settings</p>
                <p className="text-sm text-muted-foreground">
                  Changes to security settings may affect all users. Proceed with caution.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={securitySettings.requireMfa}
                onChange={(e) => setSecuritySettings({ ...securitySettings, requireMfa: e.target.checked })}
                className="w-5 h-5 rounded border-border bg-muted/20 text-primary focus:ring-primary"
              />
              <div>
                <p className="text-foreground font-medium">Require MFA</p>
                <p className="text-sm text-muted-foreground">Enforce multi-factor authentication for all users</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Password Policy
              </label>
              <select
                value={securitySettings.passwordPolicy}
                onChange={(e) => setSecuritySettings({ ...securitySettings, passwordPolicy: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="basic">Basic (8+ characters)</option>
                <option value="medium">Medium (10+ chars, mixed case)</option>
                <option value="strong">Strong (12+ chars, mixed case, numbers, symbols)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Audit Log Retention (days)
              </label>
              <input
                type="number"
                value={securitySettings.auditLogRetention}
                onChange={(e) => setSecuritySettings({ ...securitySettings, auditLogRetention: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              />
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
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure platform settings and integrations</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {settingTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary/20 text-foreground border-l-2 border-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-6">
              {settingTabs.find(t => t.id === activeTab)?.name}
            </h2>
            {renderTabContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

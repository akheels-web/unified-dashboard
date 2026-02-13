import { useState } from 'react';
import {
  Palette, Sun, Moon,
  Settings2, UserCog
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const settingTabs = [
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'profile', name: 'Profile', icon: UserCog },
];

export function Settings() {
  const { theme, setTheme, brandColor, setBrandColor } = useUIStore();
  const [activeTab, setActiveTab] = useState('appearance');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <div className="space-y-8">
            {/* Theme Selection */}
            <div>
              <h3 className="text-base font-medium text-foreground mb-4">Theme</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose your preferred color scheme. Changes apply instantly.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all",
                    theme === 'light'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="p-3 rounded-full bg-orange-100 text-orange-500">
                    <Sun className="w-6 h-6" />
                  </div>
                  <span className="font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all",
                    theme === 'dark'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="p-3 rounded-full bg-slate-800 text-slate-100">
                    <Moon className="w-6 h-6" />
                  </div>
                  <span className="font-medium">Dark</span>
                </button>
              </div>
            </div>

            {/* Brand Color Selection */}
            <div>
              <h3 className="text-base font-medium text-foreground mb-4">Brand Color</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customize the primary color used throughout the dashboard.
              </p>
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

      case 'profile':
        return (
          <div className="space-y-6">
            {/* User Session Info */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Current User Session
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Display Name</p>
                  <p className="text-foreground font-medium">{useAuthStore.getState().user?.displayName || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  <p className="text-foreground font-medium">{useAuthStore.getState().user?.email || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Role</p>
                  <p className="text-primary font-bold uppercase">{useAuthStore.getState().user?.role || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">User ID</p>
                  <p className="text-foreground font-mono text-xs">{useAuthStore.getState().user?.id || 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-500 mb-2">Troubleshooting</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you are experiencing issues with missing pages, permissions, or authentication,
                try resetting the application cache. This will force a re-login and refresh your permissions.
              </p>
              <button
                onClick={() => {
                  useAuthStore.persist.clearStorage();
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Reset Application & Logout
              </button>
            </div>

            {/* Permissions Debug */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-3">Permissions Debug</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Your current permissions from Azure Entra ID:
              </p>
              <pre className="text-xs bg-black/80 text-green-400 p-4 rounded overflow-auto max-h-64">
                {JSON.stringify(useAuthStore.getState().user?.permissions, null, 2)}
              </pre>
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Customize your dashboard experience</p>
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

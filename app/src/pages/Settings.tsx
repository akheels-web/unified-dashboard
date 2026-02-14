import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Palette, Sun, Moon,
  Settings2, UserCog, ShieldCheck
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'appearance';
  const { user } = useAuthStore();

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

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
                  <p className="text-foreground font-medium">{user?.displayName || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  <p className="text-foreground font-medium">{user?.email || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Role</p>
                  <p className="text-primary font-bold uppercase">{user?.role?.replace('_', ' ') || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">User ID</p>
                  <p className="font-mono text-xs text-foreground/70 bg-background/50 p-1 rounded inline-block">
                    {user?.id || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Application Permissions */}
            <div className="bg-muted/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-medium text-foreground">Active Permissions</h3>
              </div>

              {user?.permissions && user.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.permissions.map((perm) => (
                    <div
                      key={perm}
                      className="px-3 py-1.5 rounded-md bg-background border border-border text-xs font-medium text-foreground/80 shadow-sm flex items-center gap-1.5"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {perm}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No specific permissions assigned.</p>
              )}
            </div>

            {/* Troubleshooting */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you are experiencing issues with existing sessions or permissions, you can force a full reset.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to maintain log out?')) {
                    useAuthStore.persist.clearStorage();
                    localStorage.clear();
                    window.location.href = '/';
                  }
                }}
                className="px-4 py-2 bg-background border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors text-sm font-medium"
              >
                Reset Application & Logout
              </button>
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

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-card rounded-xl border border-border overflow-hidden sticky top-24">
            {settingTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary border-l-2 border-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent'
                  )}
                >
                  <Icon className={cn("w-5 h-5", activeTab === tab.id && "text-primary")} />
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <div className="mb-6 pb-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                {settingTabs.find(t => t.id === activeTab)?.name}
              </h2>
            </div>
            {renderTabContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}


import {
  Palette, Sun, Moon,
  UserCog, Mail, User
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Settings() {
  const { theme, setTheme, brandColor, setBrandColor } = useUIStore();
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* User Session Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
          <UserCog className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Account Information</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar Section */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold border-4 border-card shadow-lg ring-1 ring-border">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
              {user?.role?.replace('_', ' ') || 'Guest'}
            </div>
          </div>

          {/* Details Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" /> Display Name
              </p>
              <p className="text-foreground font-medium text-base">{user?.displayName || 'Unknown'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email
              </p>
              <p className="text-foreground font-medium text-base">{user?.email || 'Unknown'}</p>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-1 pt-2">
              <p className="text-muted-foreground text-xs">User ID</p>
              <code className="bg-muted px-2 py-1 rounded text-xs font-mono text-foreground">{user?.id || 'Unknown'}</code>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Appearance Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
        </div>

        <div className="space-y-8">
          {/* Theme Selection */}
          <div>
            <h3 className="text-base font-medium text-foreground mb-4">Theme Mode</h3>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  theme === 'light'
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="p-2 rounded-full bg-orange-100 text-orange-500">
                  <Sun className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  theme === 'dark'
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="p-2 rounded-full bg-slate-800 text-slate-100">
                  <Moon className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">Dark</span>
              </button>
            </div>
          </div>

          {/* Brand Color Selection */}
          <div>
            <h3 className="text-base font-medium text-foreground mb-4">Accent Color</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { name: 'Blue', value: '196 67% 45%', hex: '#2596be' },
                { name: 'Purple', value: '262 83% 58%', hex: '#8b5cf6' },
                { name: 'Green', value: '142 71% 45%', hex: '#22c55e' },
                { name: 'Orange', value: '24 95% 53%', hex: '#f97316' },
                { name: 'Red', value: '0 84% 60%', hex: '#ef4444' },
                { name: 'Slate', value: '215 16% 47%', hex: '#64748b' },
              ].map((color) => (
                <button
                  key={color.name}
                  onClick={() => setBrandColor(color.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:shadow-md",
                    brandColor === color.value
                      ? "border-primary bg-secondary/50"
                      : "border-transparent hover:bg-muted"
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xs font-medium text-muted-foreground">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-red-500/5 border border-red-500/20 rounded-xl p-6"
      >
        <h3 className="text-base font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Clear local storage and reset all application states. This will log you out.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset everything and log out?')) {
                useAuthStore.persist.clearStorage();
                localStorage.clear();
                window.location.href = '/';
              }
            }}
            className="whitespace-nowrap px-4 py-2 bg-background border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors text-sm font-medium shadow-sm"
          >
            Reset & Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
}

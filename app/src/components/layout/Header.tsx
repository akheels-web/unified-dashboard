import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Menu,
  Sun,
  Moon,
  LogOut,
  Settings,
  User
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const navigate = useNavigate();
  const {
    toggleSidebar,
    theme,
    setTheme,
    unreadCount,
    notifications,
    markAllNotificationsRead
  } = useUIStore();
  const { user, logout } = useAuthStore();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      <div className="flex h-16 items-center px-4 md:px-6 gap-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 hover:bg-muted rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <img
            src="https://s40145.pcdn.co/wp-content/uploads/2022/09/LXT_Logo_Site-resized.png"
            alt="LXT"
            className="h-8 w-auto hidden md:block"
          />
          <span className="font-bold text-lg hidden md:block text-foreground">IT Portal</span>
        </div>

        {/* Center Logo - Absolute Positioned */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <img
            src="https://s40145.pcdn.co/wp-content/uploads/2022/09/LXT_Logo_Site-resized.png"
            alt="LXT Center"
            className="h-8 w-auto opacity-90"
          />
        </div>

        {/* Spacer to push right content */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 hover:bg-muted rounded-full transition-colors relative"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <Sun className="w-5 h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
            <Moon className="w-5 h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-muted rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden py-1"
                >
                  <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-xs text-primary hover:text-primary/80"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={cn("px-4 py-3 hover:bg-muted/50 border-b last:border-0 border-border", !n.read && "bg-primary/5")}>
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.timestamp).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 hover:bg-muted p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-border"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-none">{user?.displayName || 'User'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.role?.replace('_', ' ') || 'Guest'}</p>
              </div>
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden py-1"
                >
                  <div className="px-3 py-2 border-b border-border md:hidden">
                    <p className="text-sm font-medium">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      My Profile
                    </button>
                  </div>

                  <div className="h-px bg-border my-1" />

                  <div className="p-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

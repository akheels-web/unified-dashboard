import { Bell, Search, Menu, Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export function Header() {
  const { toggleSidebar, notifications, unreadCount, theme, setTheme, sidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 h-16 bg-card/80 backdrop-blur-md border-b border-border z-30 flex items-center justify-between px-4 transition-all duration-300",
        sidebarCollapsed ? "pl-24" : "pl-[280px]" // 80px + 16px padding, 260px + 20px padding
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors relative"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-medium">
            {user?.displayName?.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}

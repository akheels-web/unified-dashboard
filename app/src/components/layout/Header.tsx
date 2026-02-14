import { useNavigate } from 'react-router-dom';

/* ... imports ... */

export function Header() {
  const navigate = useNavigate();
  /* ... hooks ... */

  /* ... inside return ... */

  {/* Search - REMOVED */ }
      </div >

    /* ... inside profile menu ... */

    <div className="p-1">
      <button
        onClick={() => {
          navigate('/settings?tab=profile');
          setShowProfileMenu(false);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
      >
        <User className="w-4 h-4 text-muted-foreground" />
        My Profile
      </button>
      <button
        onClick={() => {
          navigate('/settings?tab=appearance');
          setShowProfileMenu(false);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
      >
        <Settings className="w-4 h-4 text-muted-foreground" />
        Settings
      </button>
    </div>
  import { Bell, Search, Menu, Sun, Moon, LogOut, Settings, User } from 'lucide-react';
  import { useUIStore } from '@/stores/uiStore';
  import { useAuthStore } from '@/stores/authStore';
  import { cn } from '@/lib/utils';
  import { motion, AnimatePresence } from 'framer-motion';

  export function Header() {
    const { toggleSidebar, theme, setTheme, sidebarCollapsed, unreadCount, toggleMobileMenu } = useUIStore();
    const { user, logout } = useAuthStore();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setShowProfileMenu(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    return (
      <header
        className={cn(
          "fixed top-0 right-0 left-0 h-16 bg-card/80 backdrop-blur-md border-b border-border z-30 flex items-center justify-between px-4 transition-all duration-300",
          sidebarCollapsed ? "md:pl-24" : "md:pl-[280px]", // Desktop padding only
          "pl-4" // Mobile padding standard
        )}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                toggleMobileMenu();
              } else {
                toggleSidebar();
              }
            }}
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

          {/* User Profile Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 pl-4 border-l border-border hover:opacity-80 transition-opacity"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-medium">
                {user?.displayName?.charAt(0)}
              </div>
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg shadow-black/5 overflow-hidden z-50 py-1"
                >
                  <div className="px-4 py-3 border-b border-border md:hidden">
                    <p className="text-sm font-medium text-foreground">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>

                  <div className="p-1">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
                      <User className="w-4 h-4 text-muted-foreground" />
                      My Profile
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Settings
                    </button>
                  </div>

                  <div className="h-px bg-border my-1" />

                  <div className="p-1">
                    <button
                      onClick={() => {
                        if (confirm('Reset application cache and logout?')) {
                          useAuthStore.persist.clearStorage();
                          localStorage.clear();
                          window.location.href = '/';
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4 rotate-180" />
                      Reset App & Logout
                    </button>
                    <button
                      onClick={() => logout()}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    );
  }

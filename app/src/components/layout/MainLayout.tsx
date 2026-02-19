import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { sidebarCollapsed, globalLoading, loadingMessage, mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "md:pl-20" : "md:pl-64" // Desktop: Padding based on sidebar
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="px-6 py-6"   // 🔥 CLEAN consistent spacing
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Global Loading Overlay */}
      {globalLoading && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-muted rounded-full" />
              <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
            </div>
            {loadingMessage && (
              <p className="text-muted-foreground text-sm">{loadingMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

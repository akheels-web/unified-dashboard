import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { instance } = useMsal();
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    setMousePosition({ x: x * 5, y: y * 5 });
  };

  const getUserGroups = async (accessToken: string) => {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf?$select=id,displayName', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.value || [];
    } catch (e) {
      console.error("Failed to fetch user groups", e);
      return [];
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await instance.loginPopup(loginRequest);
      const { account, accessToken } = result;

      console.log('Login successful. Converting token to verified user role...');

      // Fetch user groups to determine role
      const groups = await getUserGroups(accessToken);
      const groupIds = groups.map((g: any) => g.id);

      // Define Group IDs (Should be in .env in production)
      const ADMIN_GROUP_ID = import.meta.env.VITE_ADMIN_GROUP_ID || 'admin-group-id';
      const USER_GROUP_ID = import.meta.env.VITE_USER_GROUP_ID || 'user-group-id';

      let role: 'it_admin' | 'it_user' = 'it_user'; // Default to User

      if (groupIds.includes(ADMIN_GROUP_ID)) {
        role = 'it_admin';
      } else if (groupIds.includes(USER_GROUP_ID)) {
        role = 'it_user';
      } else {
        // Optional: If user is in neither group, maybe deny access or default to limited user
        // For now, defaulting to 'it_user' but you might want 'guest' or 'unauthorized'
        console.warn('User not in configured Admin or User groups. Defaulting to IT User.');
      }

      console.log(`User assigned role: ${role} based on groups:`, groupIds);

      // Map MSAL account to App User
      const user = {
        id: account.homeAccountId,
        entraId: account.localAccountId,
        email: account.username,
        displayName: account.name || account.username,
        role: role,
        department: 'IT', // Placeholder
        isActive: true,
        createdAt: new Date().toISOString(),
        permissions: role === 'it_admin' ? {
          dashboard: true,
          users: true,
          groups: true,
          assets: true,
          software: true,
          onboarding: true,
          offboarding: true,
          network: true,
          sites: true,
          proxmox: true,
          patchManagement: true,
          reports: true,
          auditLogs: true,
          settings: true,
        } : {
          dashboard: true,
          users: true,
          groups: true,
          assets: true,
          software: true, // Specific permissions for limited user
          onboarding: false,
          offboarding: false,
          network: true,
          sites: true,
          proxmox: true,
          patchManagement: false,
          reports: false,
          auditLogs: false,
          settings: false,
        }
      };

      // Force clear any old state before logging in
      useAuthStore.persist.clearStorage();

      login(user); // Sync to usage store
      toast.success(`Welcome back, ${user.displayName}! Role: ${role === 'it_admin' ? 'Admin' : 'User'}`);
      navigate('/');
    } catch (e: any) {
      toast.error(`Login failed: ${e.message}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        {/* Animated gradient background - Keeping dark aesthetic for left panel even in light mode for contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2d2d2d] via-[#1a1a1a] to-[#0a0a0a]" />

        {/* Floating shapes */}
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-6">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-5xl font-bold text-white mb-4"
          >
            IT Operations Portal
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-xl text-[#a0a0a0] mb-8"
          >
            Unified platform for IT lifecycle management
          </motion.p>
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, rotateY: -30 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMousePosition({ x: 0, y: 0 })}
          style={{
            transform: `perspective(1000px) rotateX(${-mousePosition.y}deg) rotateY(${mousePosition.x}deg)`,
            transition: 'transform 0.1s ease-out',
          }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-2xl p-8 border border-border shadow-2xl">
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-foreground text-center mb-2">
                Welcome Back
              </h2>
              <p className="text-muted-foreground text-center mb-8">
                Sign in with your Microsoft account
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full py-3 bg-[#2F2F2F] text-white font-semibold rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 border border-border"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0H10.5V10.5H0V0Z" fill="#F25022" />
                    <path d="M11.5 0H22V10.5H11.5V0Z" fill="#7FBA00" />
                    <path d="M0 11.5H10.5V22H0V11.5Z" fill="#00A4EF" />
                    <path d="M11.5 11.5H22V22H11.5V11.5Z" fill="#FFB900" />
                  </svg>
                  Sign in with Microsoft
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

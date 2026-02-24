import { useState, useEffect } from 'react';
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
  const [hasLoggedInBefore, setHasLoggedInBefore] = useState(false);

  useEffect(() => {
    // Check if the user has logged in before on this browser
    const previousLogin = localStorage.getItem('hasLoggedInBefore');
    if (previousLogin === 'true') {
      setHasLoggedInBefore(true);
    }
  }, []);



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

      // Login successful. Converting token to verified user role

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

      // User assigned role

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

      // Set the flag so next time they see "Welcome back"
      localStorage.setItem('hasLoggedInBefore', 'true');

      login(user); // Sync to usage store
      toast.success(`${hasLoggedInBefore ? 'Welcome back' : 'Welcome'}, ${user.displayName}! Role: ${role === 'it_admin' ? 'Admin' : 'User'}`);
      navigate('/');
    } catch (e: any) {
      toast.error(`Login failed: ${e.message}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex overflow-hidden font-sans">
      {/* Left Panel - Premium Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="hidden lg:flex lg:w-3/5 w-1/2 relative items-center justify-center overflow-hidden"
      >
        {/* Dynamic Abstract Background */}
        <div className="absolute inset-0 bg-[#0A0A0A] z-0" />

        {/* Glowing Orbs */}
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen z-10"
        />
        <motion.div
          animate={{ x: [0, -60, 0], y: [0, 50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear', delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen z-10"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full z-10"
        />
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] border border-white/5 rounded-full z-10"
        />

        {/* Content */}
        <div className="relative z-20 flex flex-col justify-center px-24 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 100 }}
            className="mb-10"
          >
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-blue-600 p-[2px] shadow-2xl shadow-primary/20">
              <div className="w-full h-full bg-black/50 backdrop-blur-xl rounded-[calc(2rem-2px)] flex items-center justify-center">
                <Shield className="w-12 h-12 text-white" strokeWidth={1.5} />
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-6xl font-light text-white tracking-tight leading-[1.1] mb-6"
          >
            Unified <br />
            <span className="font-semibold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
              IT Operations
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-2xl text-white/50 font-light max-w-lg leading-relaxed"
          >
            Orchestrate your enterprise identity, access, and asset lifecycles from a single, intelligent pane of glass.
          </motion.p>
        </div>

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30 z-10 mix-blend-screen mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]" />
      </motion.div>

      {/* Right Panel - Glassmorphic Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-6 lg:p-16 relative bg-[#050505] lg:bg-transparent">

        {/* Mobile Background (only visible on small screens) */}
        <div className="absolute inset-0 lg:hidden overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] relative z-20"
        >
          {/* Glass Card Container */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.05] shadow-2xl rounded-3xl p-10 lg:p-12 relative overflow-hidden">

            {/* Very subtle inner glow */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-blue-600 p-[1px] shadow-2xl">
                <div className="w-full h-full bg-black rounded-[calc(1rem-1px)] flex items-center justify-center">
                  <Shield className="w-10 h-10 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center lg:text-left mb-10"
            >
              <h2 className="text-3xl font-semibold text-white tracking-tight mb-3">
                {hasLoggedInBefore ? 'Welcome back' : 'Welcome'}
              </h2>
              <p className="text-white/50 text-base">
                Sign in with your enterprise Microsoft account to continue.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="group relative w-full h-[56px] bg-[#111111] hover:bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Button Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative w-full h-full flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                      <span className="text-white font-medium">Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0H10.5V10.5H0V0Z" fill="#F25022" />
                        <path d="M11.5 0H22V10.5H11.5V0Z" fill="#7FBA00" />
                        <path d="M0 11.5H10.5V22H0V11.5Z" fill="#00A4EF" />
                        <path d="M11.5 11.5H22V22H11.5V11.5Z" fill="#FFB900" />
                      </svg>
                      <span className="text-white font-medium tracking-wide">Continue with Microsoft</span>
                    </>
                  )}
                </div>
              </button>
            </motion.div>

            <div className="mt-10 text-center text-xs text-white/30 font-light">
              Secure authentication via Entra ID
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

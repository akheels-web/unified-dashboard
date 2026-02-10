import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    setMousePosition({ x: x * 5, y: y * 5 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock authentication - in real app, this would validate against Entra ID
    const mockUser = {
      id: '1',
      entraId: 'mock-entra-id',
      email: email,
      displayName: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      role: email.includes('admin') ? 'it_admin' as const : 'it_user' as const,
      department: 'IT',
      isActive: true,
      createdAt: new Date().toISOString(),
      permissions: {
        dashboard: true,
        users: true,
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
      }
    };

    login(mockUser);
    toast.success('Welcome back!');
    navigate('/');
    setIsLoading(false);
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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">1</span>
              </div>
              <span className="text-[#a0a0a0]">Seamless M365 Integration</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">2</span>
              </div>
              <span className="text-[#a0a0a0]">Automated Onboarding & Offboarding</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">3</span>
              </div>
              <span className="text-[#a0a0a0]">Asset & Network Management</span>
            </div>
          </motion.div>
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
                Sign in to access the platform
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3 bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  disabled={isLoading}
                />
              </motion.div>

              {/* Password */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>

              {/* Remember Me & Forgot Password */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="flex items-center justify-between"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-border bg-muted/20 text-primary focus:ring-primary" />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <a href="#" className="text-sm text-primary hover:underline">
                  Forgot password?
                </a>
              </motion.div>

              {/* Submit Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </motion.button>
            </form>

            {/* Demo credentials hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="mt-6 text-xs text-muted-foreground text-center"
            >
              Demo: Use any email with password "admin" for IT admin access
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

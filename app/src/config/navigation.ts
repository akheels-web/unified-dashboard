import {
    LayoutDashboard,
    Users,
    Laptop,
    AppWindow,
    UserPlus,
    UserMinus,
    Wifi,
    BarChart3,
    ClipboardList,
    Shield,
    Globe,
    Server,
} from 'lucide-react';

export interface NavItem {
    path: string;
    label: string;
    icon: React.ElementType;
    roles?: string[];
    badge?: number;
}

export const navItems: NavItem[] = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/users', label: 'Users', icon: Users, roles: ['it_admin', 'it_user'] },
    { path: '/groups', label: 'Groups', icon: Users, roles: ['it_admin', 'it_user'] },
    { path: '/shared-mailboxes', label: 'Shared Mailboxes', icon: AppWindow, roles: ['it_admin', 'it_user'] },
    { path: '/inventory', label: 'Assets', icon: Laptop, roles: ['it_admin', 'it_user'] },
    { path: '/licenses', label: 'Licenses', icon: Shield, roles: ['it_admin', 'it_user'] },
    { path: '/software', label: 'Software', icon: AppWindow, roles: ['it_admin', 'it_user'] },
    { path: '/identity/apps', label: 'Enterprise Apps', icon: Shield, roles: ['it_admin', 'it_user'] },
    { path: '/onboarding', label: 'Onboarding', icon: UserPlus, badge: 8 },
    { path: '/offboarding', label: 'Offboarding', icon: UserMinus, badge: 5 },

    { path: '/network', label: 'Network', icon: Wifi, roles: ['it_admin', 'it_user'] },
    { path: '/sites', label: 'Sites', icon: Globe, roles: ['it_admin'] },
    { path: '/proxmox', label: 'Proxmox', icon: Server, roles: ['it_admin', 'it_user'] },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/audit', label: 'Audit Logs', icon: ClipboardList, roles: ['it_admin'] },
];

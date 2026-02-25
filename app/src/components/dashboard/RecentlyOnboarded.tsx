import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2 } from 'lucide-react';
import { usersApi } from '@/services/api';

export function RecentlyOnboarded() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchUsers = async () => {
            try {
                const res = await usersApi.getNewUsers();
                if (isMounted && res?.success) {
                    setUsers(res.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch new users:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchUsers();
        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm min-h-[300px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
        >
            <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">🆕 Newly Onboarded</h3>
                        <p className="text-sm text-muted-foreground">Last 7 Days ({users.length} added)</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                {users.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No new users onboarded in the last 7 days.
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 text-muted-foreground">
                            <tr>
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Department</th>
                                <th className="px-6 py-3 font-medium">Title</th>
                                <th className="px-6 py-3 font-medium text-right">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-xs">
                                                {user.displayName?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">{user.displayName}</div>
                                                <div className="text-xs text-muted-foreground">{user.userPrincipalName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-foreground">{user.department || '-'}</td>
                                    <td className="px-6 py-4 text-foreground">{user.jobTitle || '-'}</td>
                                    <td className="px-6 py-4 text-right text-muted-foreground">
                                        {new Date(user.createdDateTime).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </motion.div>
    );
}

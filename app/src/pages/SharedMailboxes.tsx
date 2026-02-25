import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Mail, Users as UsersIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { messagingApi } from '@/services/api';
import { toast } from 'sonner';

export function SharedMailboxes() {
    const [mailboxes, setMailboxes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 15;

    const [selectedMailbox, setSelectedMailbox] = useState<any | null>(null);

    useEffect(() => {
        loadMailboxes();
    }, []);

    const loadMailboxes = async () => {
        setLoading(true);
        try {
            const response = await messagingApi.getSharedMailboxes();
            if (response.success && response.data) {
                setMailboxes(response.data);
            }
        } catch (error) {
            toast.error('Failed to load shared mailboxes');
        } finally {
            setLoading(false);
        }
    };

    const filteredMailboxes = mailboxes.filter(mb =>
        search === '' ||
        mb.name?.toLowerCase().includes(search.toLowerCase()) ||
        mb.email?.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filteredMailboxes.length / pageSize) || 1;
    const paginatedMailboxes = filteredMailboxes.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Shared Mailboxes</h1>
                    <p className="text-muted-foreground">Manage M365 shared mailboxes and member access</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search mailboxes..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Mailbox</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Members Count</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : paginatedMailboxes.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                        No shared mailboxes found
                                    </td>
                                </tr>
                            ) : (
                                paginatedMailboxes.map((mb) => (
                                    <tr
                                        key={mb.id}
                                        onClick={() => setSelectedMailbox(mb)}
                                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <Mail className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-foreground font-medium">{mb.name || 'Unknown'}</p>
                                                    <p className="text-sm text-muted-foreground">{mb.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-foreground font-medium">{mb.members?.length || 0} members</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-muted-foreground text-sm">
                                                {mb.created
                                                    ? new Date(mb.created).toLocaleDateString()
                                                    : '-'
                                                }
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination font-sized standard */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                        Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredMailboxes.length)} of {filteredMailboxes.length} mailboxes
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Slide-out details */}
            <AnimatePresence>
                {selectedMailbox && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                            onClick={() => setSelectedMailbox(null)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-card border-b border-border p-6 flex justify-between items-center z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">{selectedMailbox.name}</h2>
                                        <p className="text-sm text-muted-foreground">{selectedMailbox.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedMailbox(null)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <section>
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                        Mailbox Members ({selectedMailbox.members?.length || 0})
                                    </h3>
                                    {selectedMailbox.members?.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">No members assigned to this mailbox.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedMailbox.members?.map((member: string, _idx: number) => (
                                                <div key={_idx} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                        <UsersIcon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">{member}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

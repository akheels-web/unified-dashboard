import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, UserX, Shield, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getAccessToken } from '@/services/auth';

interface DrillDownModalProps {
    type: 'alerts' | 'risky-users' | 'non-compliant' | 'external-forwarding' | null;
    onClose: () => void;
}

export function SecurityDrillDownModal({ type, onClose }: DrillDownModalProps) {

    if (!type) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card w-full max-w-4xl rounded-xl border border-border shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${type === 'alerts' ? 'bg-red-500/10 text-red-500' :
                                    type === 'risky-users' ? 'bg-orange-500/10 text-orange-500' :
                                        type === 'non-compliant' ? 'bg-yellow-500/10 text-yellow-500' :
                                            'bg-blue-500/10 text-blue-500'
                                }`}>
                                {type === 'alerts' && <AlertTriangle className="w-5 h-5" />}
                                {type === 'risky-users' && <UserX className="w-5 h-5" />}
                                {type === 'non-compliant' && <Shield className="w-5 h-5" />}
                                {type === 'external-forwarding' && <ExternalLink className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                    {type === 'alerts' && 'High Severity Alerts'}
                                    {type === 'risky-users' && 'High Risk Users'}
                                    {type === 'non-compliant' && 'Non-Compliant Devices'}
                                    {type === 'external-forwarding' && 'External Forwarding Rules'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {type === 'alerts' && 'Critical security incidents requiring immediate attention'}
                                    {type === 'risky-users' && 'Users flagged with high risk level in Identity Protection'}
                                    {type === 'non-compliant' && 'Devices failing compliance policies'}
                                    {type === 'external-forwarding' && 'Mailbox rules forwarding email externally'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="p-0 overflow-auto flex-1">
                        <div className="p-8 text-center text-muted-foreground">
                            {/* Placeholder for content - In a real app this would fetch and display the list */}
                            Loading details...
                        </div>
                    </div>

                    <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
                        <button
                            onClick={() => type === 'alerts' ? window.open('https://security.microsoft.com', '_blank') : window.open('https://entra.microsoft.com', '_blank')}
                            className="flex items-center gap-2 text-xs text-primary hover:underline"
                        >
                            View in Microsoft Portal <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

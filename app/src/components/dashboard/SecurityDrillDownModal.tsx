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
    {/* Footer */ }
    <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
        <button
            onClick={() => type === 'alerts' ? window.open('https://security.microsoft.com', '_blank') : window.open('https://entra.microsoft.com', '_blank')}
            className="flex items-center gap-2 text-xs text-primary hover:underline"
        >
            View in Microsoft Portal <ExternalLink className="w-3 h-3" />
        </button>
    </div>
                </motion.div >
            </div >
        </AnimatePresence >
    );
}

import { motion } from 'framer-motion';
import { User, Mail, ShieldCheck } from 'lucide-react';

interface TeamMember {
    name: string;
    email: string;
    role: string;
}

const TEAM_MEMBERS: TeamMember[] = [
    {
        name: 'Absal Abdulhafedh',
        email: 'absal.abdulhafedh@lxt.ai',
        role: 'IT and Security Director'
    },
    {
        name: 'Ibrahim Aly',
        email: 'Ibrahim.aly@lxt.ai',
        role: 'IT Manager'
    },
    {
        name: 'Youssef Ragab',
        email: 'Youssef.ragab@lxt.ai',
        role: 'Senior IT Specialist'
    },
    {
        name: 'Dilawar Amin',
        email: 'dilawar.amin@lxt.ai',
        role: 'IT Specialist'
    },
    {
        name: 'Mohammed Akheel',
        email: 'mohammed.akheel@lxt.ai',
        role: 'IT Specialist'
    }
];

export function ITTeamSection() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-card rounded-xl border border-border p-6 shadow-sm h-full"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-foreground">IT Team</h3>
                    <p className="text-sm text-muted-foreground">Contact support for assistance</p>
                </div>
            </div>

            <div className="space-y-4">
                {TEAM_MEMBERS.map((member, index) => (
                    <div
                        key={member.email}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                    >
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-muted-foreground" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {member.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                {member.role}
                            </p>
                        </div>

                        <a
                            href={`mailto:${member.email}`}
                            className="p-2 rounded-full hover:bg-background text-muted-foreground hover:text-primary transition-colors"
                            title="Send Email"
                        >
                            <Mail className="w-4 h-4" />
                        </a>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

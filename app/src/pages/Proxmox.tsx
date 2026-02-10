import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Server, Cpu, HardDrive, Activity,
    RefreshCw, Plus, Trash2, Monitor, X,
    ChevronDown, ChevronRight, Power, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProxmoxStore, type ProxmoxNode, type ProxmoxVm } from '@/stores/proxmoxStore';
import { toast } from 'sonner';

export function Proxmox() {
    const { nodes, vms, addNode, deleteNode, addVm, deleteVm } = useProxmoxStore();
    const [isLoading, setIsLoading] = useState(false);
    const [showAddNodeModal, setShowAddNodeModal] = useState(false);
    const [showAddVmModal, setShowAddVmModal] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(nodes.map(n => n.id)));

    const [newNodeData, setNewNodeData] = useState<Partial<ProxmoxNode>>({
        name: '', status: 'online', totalCpu: 32, totalRam: 64, totalDisk: 1000
    });
    const [newVmData, setNewVmData] = useState<Partial<ProxmoxVm>>({
        id: '', name: '', status: 'running', cores: 2, memory: 4, storage: 50
    });

    const toggleNode = (nodeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
        } else {
            newExpanded.add(nodeId);
        }
        setExpandedNodes(newExpanded);
    };

    const handleRefresh = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            toast.success('Cluster stats refreshed');
        }, 800);
    };

    const handleAddNode = () => {
        if (!newNodeData.name) return toast.error('Node name is required');

        addNode({
            id: `pve-${Math.random().toString(36).substr(2, 6)}`,
            name: newNodeData.name,
            status: 'online',
            cpu: Math.floor(Math.random() * 30) + 5, // Mock usage
            ram: Math.floor(Math.random() * 40) + 10,
            disk: Math.floor(Math.random() * 20) + 5,
            uptime: '0m',
            totalCpu: Number(newNodeData.totalCpu) || 32,
            totalRam: Number(newNodeData.totalRam) || 64,
            totalDisk: Number(newNodeData.totalDisk) || 1000
        } as ProxmoxNode);

        setShowAddNodeModal(false);
        toast.success('Node added successfully');
        setNewNodeData({ name: '', status: 'online', totalCpu: 32, totalRam: 64, totalDisk: 1000 });
    };

    const handleAddVm = () => {
        if (!selectedNodeId) return;
        if (!newVmData.name) return toast.error('VM name is required');
        if (!newVmData.id) return toast.error('VM ID is required');

        addVm({
            id: newVmData.id,
            nodeId: selectedNodeId,
            name: newVmData.name,
            status: 'running',
            cpu: Math.floor(Math.random() * 50) + 10, // Mock usage
            ram: Math.floor(Math.random() * 60) + 20,
            disk: Math.floor(Math.random() * 40) + 10,
            uptime: '0m',
            cores: Number(newVmData.cores) || 2,
            memory: Number(newVmData.memory) || 4,
            storage: Number(newVmData.storage) || 50
        } as ProxmoxVm);

        setShowAddVmModal(false);
        toast.success('VM added successfully');
        setNewVmData({ id: '', name: '', status: 'running', cores: 2, memory: 4, storage: 50 });
    };

    const handleDeleteNode = (id: string, name: string) => {
        if (confirm(`Delete node ${name} and all its VMs?`)) {
            deleteNode(id);
            toast.success('Node deleted');
        }
    };

    const handleDeleteVm = (id: string, name: string) => {
        if (confirm(`Delete VM ${name}?`)) {
            deleteVm(id);
            toast.success('VM deleted');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Proxmox Cluster</h1>
                    <p className="text-muted-foreground mt-1">Manage nodes and virtual machines</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted text-foreground rounded-lg transition-colors border border-border disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowAddNodeModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#ed7422] hover:bg-[#ed7422]/90 text-white font-medium rounded-lg transition-colors shadow-lg shadow-orange-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add Node
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {nodes.map((node) => (
                    <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl border border-border overflow-hidden"
                    >
                        {/* Node Header */}
                        <div className="p-4 border-b border-border bg-muted/10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleNode(node.id)}>
                                    <button className="p-1 hover:bg-muted rounded text-muted-foreground">
                                        {expandedNodes.has(node.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center",
                                        node.status === 'online' ? "bg-green-500/10" : "bg-red-500/10"
                                    )}>
                                        <Server className={cn(
                                            "w-6 h-6",
                                            node.status === 'online' ? "text-green-500" : "text-red-500"
                                        )} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground text-lg">{node.name}</h3>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <div className={cn("w-2 h-2 rounded-full", node.status === 'online' ? "bg-green-500" : "bg-red-500")} />
                                                {node.status.toUpperCase()}
                                            </span>
                                            <span className="flex items-center gap-1" title={`Total: ${node.totalCpu || '?'} Cores`}>
                                                <Cpu className="w-3 h-3" /> {node.cpu}% ({node.totalCpu}C)
                                            </span>
                                            <span className="flex items-center gap-1" title={`Total: ${node.totalRam || '?'} GB`}>
                                                <Activity className="w-3 h-3" /> {node.ram}% ({node.totalRam}GB)
                                            </span>
                                            <span className="flex items-center gap-1" title={`Total: ${node.totalDisk || '?'} GB`}>
                                                <HardDrive className="w-3 h-3" /> {node.disk}% ({node.totalDisk}GB)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setSelectedNodeId(node.id); setShowAddVmModal(true); }}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors border border-primary/20"
                                    >
                                        <Plus className="w-3 h-3" /> Add VM
                                    </button>
                                    <button
                                        onClick={() => handleDeleteNode(node.id, node.name)}
                                        className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* VM List */}
                        <AnimatePresence>
                            {expandedNodes.has(node.id) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-border"
                                >
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {vms.filter(vm => vm.nodeId === node.id).map(vm => (
                                            <div key={vm.id} className="group bg-muted/20 hover:bg-muted/40 border border-border rounded-lg p-3 transition-colors relative">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Monitor className="w-5 h-5 text-blue-500" />
                                                        <span className="font-medium text-foreground">{vm.name}</span>
                                                    </div>
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        vm.status === 'running' ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                                                    )} />
                                                </div>

                                                <div className="grid grid-cols-3 gap-1 mb-2 text-[10px] text-muted-foreground bg-black/10 p-1.5 rounded">
                                                    <div className="text-center border-r border-border/50">
                                                        <div className="font-bold text-foreground">{vm.cores || '-'}</div>
                                                        <div>Cores</div>
                                                    </div>
                                                    <div className="text-center border-r border-border/50">
                                                        <div className="font-bold text-foreground">{vm.memory || '-'}G</div>
                                                        <div>RAM</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="font-bold text-foreground">{vm.storage || '-'}G</div>
                                                        <div>Disk</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 my-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">CPU</span>
                                                        <span className="text-foreground">{vm.cpu}%</span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-1">
                                                        <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${vm.cpu}%` }} />
                                                    </div>
                                                    <div className="flex justify-between text-xs mt-1">
                                                        <span className="text-muted-foreground">RAM</span>
                                                        <span className="text-foreground">{vm.ram}%</span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-1">
                                                        <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${vm.ram}%` }} />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/50">
                                                    <span className="text-xs text-muted-foreground font-mono">ID: {vm.id}</span>
                                                    <button
                                                        onClick={() => handleDeleteVm(vm.id, vm.name)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 text-destructive rounded transition-all"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {vms.filter(vm => vm.nodeId === node.id).length === 0 && (
                                            <div className="col-span-full py-6 text-center text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg">
                                                No VMs running on this node
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            {/* Add Node Modal */}
            <AnimatePresence>
                {showAddNodeModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAddNodeModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <h2 className="text-xl font-bold text-foreground">Add New Node</h2>
                                <button onClick={() => setShowAddNodeModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Node Name</label>
                                    <input
                                        value={newNodeData.name}
                                        onChange={e => setNewNodeData({ ...newNodeData, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                        placeholder="pve-cluster-xx"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Cores</label>
                                        <input
                                            type="number"
                                            value={newNodeData.totalCpu}
                                            onChange={e => setNewNodeData({ ...newNodeData, totalCpu: Number(e.target.value) })}
                                            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">RAM (GB)</label>
                                        <input
                                            type="number"
                                            value={newNodeData.totalRam}
                                            onChange={e => setNewNodeData({ ...newNodeData, totalRam: Number(e.target.value) })}
                                            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Disk (GB)</label>
                                        <input
                                            type="number"
                                            value={newNodeData.totalDisk}
                                            onChange={e => setNewNodeData({ ...newNodeData, totalDisk: Number(e.target.value) })}
                                            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-muted/20 flex justify-end gap-3">
                                <button onClick={() => setShowAddNodeModal(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground">Cancel</button>
                                <button onClick={handleAddNode} className="px-4 py-2 bg-[#ed7422] text-white rounded-lg hover:bg-[#ed7422]/90">Add Node</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add VM Modal */}
            <AnimatePresence>
                {showAddVmModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAddVmModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <h2 className="text-xl font-bold text-foreground">Add New VM</h2>
                                <button onClick={() => setShowAddVmModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">VM ID</label>
                                        <input
                                            value={newVmData.id}
                                            onChange={e => setNewVmData({ ...newVmData, id: e.target.value })}
                                            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                            placeholder="100"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">VM Name</label>
                                        <input
                                            value={newVmData.name}
                                            onChange={e => setNewVmData({ ...newVmData, name: e.target.value })}
                                            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                            placeholder="web-server-01"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Cores</label>
                                        <input
                                            type="number"
                                            value={newVmData.cores}
                                            onChange={e => setNewVmData({ ...newVmData, cores: Number(e.target.value) })}
                                            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">RAM (GB)</label>
                                        <input
                                            type="number"
                                            value={newVmData.memory}
                                            onChange={e => setNewVmData({ ...newVmData, memory: Number(e.target.value) })}
                                            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Disk (GB)</label>
                                        <input
                                            type="number"
                                            value={newVmData.storage}
                                            onChange={e => setNewVmData({ ...newVmData, storage: Number(e.target.value) })}
                                            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-muted/20 flex justify-end gap-3">
                                <button onClick={() => setShowAddVmModal(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground">Cancel</button>
                                <button onClick={handleAddVm} className="px-4 py-2 bg-[#ed7422] text-white rounded-lg hover:bg-[#ed7422]/90">Add VM</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

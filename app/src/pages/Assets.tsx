import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, MoreVertical, RefreshCw,
  Laptop, Smartphone, Monitor, Wifi, Mouse, Key,
  ChevronLeft, ChevronRight, X, User, MapPin,
  Calendar, Wrench, CheckCircle2, AlertTriangle,
  Loader2, QrCode, Download
} from 'lucide-react';
import { useAssetStore } from '@/stores/assetStore';
import { useUIStore } from '@/stores/uiStore';
import { assetsApi } from '@/services/api';
import type { Asset } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, React.ElementType> = {
  'Laptops': Laptop,
  'Desktops': Monitor,
  'Mobile Devices': Smartphone,
  'Peripherals': Mouse,
  'Network Equipment': Wifi,
  'Software Licenses': Key,
};

export function Assets() {
  const {
    assets, filters, pagination, isLoading,
    setAssets, setFilters, setPagination, setLoading
  } = useAssetStore();
  const { addNotification } = useUIStore();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedOS, setSelectedOS] = useState<string>('all');
  const [ownershipType, setOwnershipType] = useState<'all' | 'corporate' | 'personal'>('all');
  const [showAssetDetail, setShowAssetDetail] = useState(false);
  const [assetDetail, setAssetDetail] = useState<Asset | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
  }, [filters, pagination.page, selectedOS, ownershipType]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      // Fetch ALL assets without pagination (we'll paginate client-side after filtering)
      const assetResponse = await assetsApi.getAssets(
        filters,
        1,
        1000 // Fetch up to 1000 devices to get all of them
      );

      if (assetResponse.success && assetResponse.data) {
        let filteredAssets = assetResponse.data.data;

        // Apply OS filter based on assetTag (managedDeviceName) patterns
        if (selectedOS !== 'all') {
          filteredAssets = filteredAssets.filter((asset: Asset) => {
            // Use assetTag instead of name - assetTag contains managedDeviceName with OS info
            const assetTag = asset.assetTag || '';
            const assetTagLower = assetTag.toLowerCase();

            switch (selectedOS) {
              case 'windows':
                // Match: _Windows, Windows (space or underscore), windows
                return assetTag.includes('_Windows') || assetTag.includes(' Windows') ||
                  assetTagLower.includes('_windows') || assetTagLower.includes(' windows');
              case 'macos':
                // Match: _MacOS, MacOS (space or underscore), macos
                return assetTag.includes('_MacOS') || assetTag.includes(' MacOS') ||
                  assetTagLower.includes('_macos') || assetTagLower.includes(' macos');
              case 'ios':
                // Match: _iPhone, iPhone, _iOS, iOS
                return assetTag.includes('_iPhone') || assetTag.includes(' iPhone') ||
                  assetTag.includes('_iOS') || assetTag.includes(' iOS') ||
                  assetTagLower.includes('_iphone') || assetTagLower.includes(' iphone') ||
                  assetTagLower.includes('_ios') || assetTagLower.includes(' ios');
              case 'android':
                // Match: _Android, Android, _android, AndroidForWork
                return assetTag.includes('_Android') || assetTag.includes(' Android') ||
                  assetTagLower.includes('_android') || assetTagLower.includes(' android');
              default:
                return true;
            }
          });
        }

        // Apply ownership type filter
        if (ownershipType !== 'all') {
          filteredAssets = filteredAssets.filter((asset: Asset) => {
            const ownership = asset.assignedTo ? 'corporate' : 'personal';
            return ownership === ownershipType;
          });
        }

        // Now apply client-side pagination
        const total = filteredAssets.length;
        const totalPages = Math.ceil(total / pagination.pageSize);
        const start = (pagination.page - 1) * pagination.pageSize;
        const paginatedAssets = filteredAssets.slice(start, start + pagination.pageSize);

        setAssets(paginatedAssets);
        setPagination({
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: total,
          totalPages: totalPages,
        });
      }
    } catch (error) {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetClick = (asset: Asset) => {
    setAssetDetail(asset);
    setShowAssetDetail(true);
  };

  const handleUnassignAsset = async (assetId: string) => {
    setActionInProgress(assetId);
    try {
      const response = await assetsApi.unassignAsset(assetId);
      if (response.success) {
        toast.success('Asset unassigned successfully');
        addNotification({
          title: 'Asset Unassigned',
          message: 'Asset is now available',
          type: 'success',
        });
        loadAssets();
      }
    } catch (error) {
      toast.error('Failed to unassign asset');
    } finally {
      setActionInProgress(null);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const Icon = categoryIcons[categoryName] || Laptop;
    return Icon;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Assets</h1>
          <p className="text-muted-foreground">Manage company equipment and inventory</p>
        </div>
        <button
          onClick={loadAssets}
          className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted text-foreground rounded-lg transition-colors border border-border"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* OS Type Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All Assets', icon: Laptop },
          { key: 'windows', label: 'Windows', icon: Monitor },
          { key: 'macos', label: 'MacOS', icon: Laptop },
          { key: 'ios', label: 'iOS', icon: Smartphone },
          { key: 'android', label: 'Android', icon: Smartphone }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedOS(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors',
              selectedOS === tab.key
                ? 'bg-[#ed7422] text-white font-medium'
                : 'bg-card text-muted-foreground hover:bg-muted border border-border'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assets..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
            className="px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
            <option value="lost">Lost</option>
          </select>

          <select
            value={ownershipType}
            onChange={(e) => setOwnershipType(e.target.value as 'all' | 'corporate' | 'personal')}
            className="px-4 py-2 bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
          >
            <option value="all">All Types</option>
            <option value="corporate">Corporate</option>
            <option value="personal">Personal</option>
          </select>

          <div className="flex items-center gap-2 bg-muted/20 rounded-lg p-1 border border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-3 py-1.5 rounded text-sm transition-colors',
                viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'px-3 py-1.5 rounded text-sm transition-colors',
                viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Table
            </button>
          </div>

          {(filters.search || filters.status) && (
            <button
              onClick={() => setFilters({ search: '', status: '', location: '' })}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Assets Grid/Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map((asset, index) => {
            const Icon = getCategoryIcon(asset.category);
            return (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleAssetClick(asset)}
                className="bg-card rounded-xl border border-border p-5 cursor-pointer hover:border-primary/50 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <StatusBadge status={asset.status as any} size="sm" />
                </div>

                <h3 className="text-foreground font-medium mb-1 truncate">{asset.name}</h3>
                <p className="text-sm text-muted-foreground mb-3 truncate">{asset.assetTag}</p>

                {asset.category === 'Network Equipment' && asset.location && (
                  <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg mb-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-500">{asset.location}</span>
                  </div>
                )}

                {asset.assignedTo && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground truncate">{asset.assignedToName}</span>
                  </div>
                )}

                {asset.warrantyExpiry && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(asset.warrantyExpiry), 'MMM yyyy')}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Asset</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Assigned To</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Warranty</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((asset) => {
                const Icon = getCategoryIcon(asset.category);
                return (
                  <tr
                    key={asset.id}
                    onClick={() => handleAssetClick(asset)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{asset.name}</p>
                          <p className="text-sm text-muted-foreground">{asset.assetTag}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground">{asset.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={asset.status as any} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground">{asset.assignedToName || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">{asset.location}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">
                        {asset.warrantyExpiry
                          ? format(new Date(asset.warrantyExpiry), 'MMM d, yyyy')
                          : '-'
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )
      }

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} assets
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPagination({ page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="p-2 hover:bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination({ page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 hover:bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Asset Detail Slide-out */}
      <AnimatePresence>
        {showAssetDetail && assetDetail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setShowAssetDetail(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-card border-b border-border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center">
                      {(() => {
                        const Icon = getCategoryIcon(assetDetail.category);
                        return <Icon className="w-8 h-8 text-primary" />;
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-foreground break-words">{assetDetail.name}</h2>
                      <p className="text-muted-foreground truncate">{assetDetail.assetTag}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <StatusBadge status={assetDetail.status as any} size="sm" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAssetDetail(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Specifications */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Specifications
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Manufacturer</p>
                      <p className="text-foreground">{assetDetail.manufacturer || '-'}</p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Model</p>
                      <p className="text-foreground">{assetDetail.model || '-'}</p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Serial Number</p>
                      <p className="text-foreground">{assetDetail.serialNumber || '-'}</p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="text-foreground">{assetDetail.category}</p>
                    </div>
                  </div>
                </section>

                {/* Assignment */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Assignment
                  </h3>
                  <div className="space-y-3">
                    {assetDetail.assignedTo ? (
                      <>
                        <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                          <User className="w-5 h-5 text-primary" />
                          <div className="flex-1">
                            <p className="text-foreground font-medium">{assetDetail.assignedToName}</p>
                            <p className="text-xs text-muted-foreground">Currently assigned</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnassignAsset(assetDetail.id)}
                          disabled={actionInProgress === assetDetail.id}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                        >
                          {actionInProgress === assetDetail.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Unassign Asset
                        </button>
                      </>
                    ) : (
                      <div className="p-4 bg-green-500/10 rounded-lg text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-foreground font-medium">Asset Available</p>
                        <p className="text-sm text-muted-foreground mb-3">This asset is ready to be assigned</p>
                        <button
                          onClick={() => toast.success('Asset assignment workflow started')}
                          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
                        >
                          Assign to User
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {/* Dates */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Important Dates
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Purchase Date</p>
                      <p className="text-foreground">
                        {assetDetail.purchaseDate
                          ? format(new Date(assetDetail.purchaseDate), 'MMM d, yyyy')
                          : '-'
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Warranty Expiry</p>
                      <p className="text-foreground">
                        {assetDetail.warrantyExpiry
                          ? format(new Date(assetDetail.warrantyExpiry), 'MMM d, yyyy')
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                </section>

                {/* Notes */}
                {assetDetail.notes && (
                  <section>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                      Notes
                    </h3>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-foreground">{assetDetail.notes}</p>
                    </div>
                  </section>
                )}

                {/* Actions */}
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => toast.success('Maintenance ticket created')}
                      className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors"
                    >
                      <Wrench className="w-4 h-4" />
                      Maintenance
                    </button>
                    <button
                      onClick={() => toast.success('QR Code generated')}
                      className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                      Generate QR
                    </button>
                    <button
                      onClick={() => toast.success('Asset details exported')}
                      className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button
                      onClick={() => toast.success('Asset marked separately for retirement')}
                      className="flex items-center justify-center gap-2 p-3 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Retire
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div >
  );
}

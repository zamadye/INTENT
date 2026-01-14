import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Activity,
  Settings,
  Eye,
  Share2,
  Plus,
  ExternalLink,
  Zap,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  Target,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JazziconAvatar } from '@/components/JazziconAvatar';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ShareModal } from '@/components/campaign/ShareModal';
import { useWallet } from '@/contexts/WalletContext';
import { useAccessLevel } from '@/contexts/AccessLevelContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import toast from 'react-hot-toast';

type TabType = 'campaigns' | 'activity' | 'settings';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, address, truncatedAddress, balance } = useWallet();
  const { accessLevel, loading: accessLoading } = useAccessLevel();
  const { campaigns, activities, isLoading, isEmpty, refetch } = useDashboardData();
  const [activeTab, setActiveTab] = useState<TabType>('campaigns');
  const [shareModalCampaign, setShareModalCampaign] = useState<any>(null);
  const [preferences, setPreferences] = useState({
    defaultCampaignType: 'defi',
    emailNotifications: false,
  });

  useEffect(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet to access the dashboard');
      navigate('/');
    }
  }, [isConnected, navigate]);

  if (!isConnected) return null;

  const tabs = [
    { id: 'campaigns' as TabType, label: 'My Campaigns', icon: LayoutGrid },
    { id: 'activity' as TabType, label: 'Activity', icon: Activity },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Plus className="w-4 h-4 text-primary" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-usdc" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const tierColors = {
    base: 'text-muted-foreground',
    active: 'text-primary',
    advanced: 'text-usdc',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-72 shrink-0"
            >
              <div className="glass rounded-2xl p-6 border border-border/50 sticky top-24 space-y-6">
                {/* User Info */}
                <div className="text-center">
                  <JazziconAvatar address={address} diameter={64} className="mx-auto mb-3" />
                  <p className="font-medium">{truncatedAddress}</p>
                  <div className="mt-2 p-3 rounded-lg bg-usdc/10 border border-usdc/30">
                    <span className="text-2xl font-display font-bold text-usdc">{balance}</span>
                    <span className="text-sm text-usdc ml-1">USDC</span>
                  </div>
                </div>

                {/* Access Level Card */}
                <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Access Level</span>
                    <Badge className={tierColors[accessLevel.tier]}>
                      {accessLevel.tier.charAt(0).toUpperCase() + accessLevel.tier.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {accessLevel.completedCampaigns} campaigns completed
                  </p>
                  {accessLevel.nextUnlock && (
                    <>
                      <Progress 
                        value={(accessLevel.completedCampaigns / accessLevel.nextUnlock.requiresCampaigns) * 100} 
                        className="h-2 mb-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {accessLevel.nextUnlock.remaining} more to unlock {accessLevel.nextUnlock.tier}
                      </p>
                    </>
                  )}
                </div>

                {/* Faucet */}
                <Button variant="outline" className="w-full" asChild>
                  <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">
                    <Zap className="w-4 h-4 mr-2" />
                    Get Testnet USDC
                  </a>
                </Button>

                {/* Navigation */}
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-primary/10 text-primary border-l-4 border-primary'
                          : 'text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </motion.aside>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1"
            >
              {activeTab === 'campaigns' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-bold">My Campaigns</h2>
                    <Button variant="gradient" onClick={() => navigate('/create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Campaign
                    </Button>
                  </div>

                  {isLoading ? (
                    <div className="glass rounded-2xl p-12 border border-border/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : isEmpty ? (
                    <EmptyState />
                  ) : (
                    <div className="glass rounded-2xl border border-border/50 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/30">
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Campaign</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Category</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                            <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campaigns.map((campaign) => (
                            <tr key={campaign.id} className="border-b border-border/20 hover:bg-secondary/30">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  {campaign.thumbnail ? (
                                    <img src={campaign.thumbnail} alt="" className="w-16 h-10 rounded object-cover bg-secondary" />
                                  ) : (
                                    <div className="w-16 h-10 rounded bg-secondary flex items-center justify-center text-lg">🖼️</div>
                                  )}
                                  <div>
                                    <span className="text-sm line-clamp-1">{campaign.caption.substring(0, 50)}...</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(campaign.createdAt, { addSuffix: true })}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 hidden md:table-cell">
                                <Badge variant="outline">{campaign.type}</Badge>
                              </td>
                              <td className="p-4 hidden sm:table-cell">
                                {campaign.status === 'completed' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-usdc/20 text-usdc">
                                    <CheckCircle className="w-3 h-3" />
                                    Completed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {campaign.status}
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => navigate(`/proofs/${campaign.id}`)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setShareModalCampaign(campaign)}
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-bold">Activity</h2>
                  <div className="glass rounded-2xl p-6 border border-border/50 space-y-6">
                    {activities.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No activity yet. Create your first campaign to get started.
                      </p>
                    ) : (
                      activities.map((activity, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="pt-1">
                            <p className="text-sm">{activity.description}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-bold">Settings</h2>
                  <div className="glass rounded-2xl p-6 border border-border/50 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Default Intent Category</Label>
                        <p className="text-xs text-muted-foreground mt-1">Pre-select when creating</p>
                      </div>
                      <Select value={preferences.defaultCampaignType} onValueChange={(v) => setPreferences({ ...preferences, defaultCampaignType: v })}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="builder">Builder</SelectItem>
                          <SelectItem value="defi">DeFi</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                          <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Share Modal */}
      {shareModalCampaign && (
        <ShareModal
          isOpen={!!shareModalCampaign}
          onClose={() => setShareModalCampaign(null)}
          campaign={{
            id: shareModalCampaign.id,
            caption: shareModalCampaign.caption,
            imageUrl: shareModalCampaign.imageUrl,
            status: shareModalCampaign.status,
          }}
          proofMinted={shareModalCampaign.status === 'minted' || shareModalCampaign.status === 'shared'}
        />
      )}
    </div>
  );
};

export default Dashboard;
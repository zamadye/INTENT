import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Image,
  Activity,
  Settings,
  Eye,
  Share2,
  Coins,
  Plus,
  ExternalLink,
  Zap,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JazziconAvatar } from '@/components/JazziconAvatar';
import { useWallet } from '@/contexts/WalletContext';
import toast from 'react-hot-toast';

type TabType = 'campaigns' | 'nfts' | 'activity' | 'settings';

// Mock data
const mockCampaigns = Array.from({ length: 12 }, (_, i) => ({
  id: `campaign-${i}`,
  thumbnail: `https://picsum.photos/seed/camp-${i}/200/120`,
  caption: `Campaign #${i + 1} - Building on Arc Network with USDC gas fees...`,
  type: ['Product Launch', 'Educational', 'Meme Campaign'][i % 3],
  minted: i % 2 === 0,
  createdAt: new Date(Date.now() - i * 3600000 * 24),
}));

const mockNFTs = mockCampaigns.filter(c => c.minted).map(c => ({
  ...c,
  tokenId: 1000 + parseInt(c.id.split('-')[1]),
}));

const mockActivity = [
  { type: 'created', description: 'Created campaign "DeFi on Arc"', timestamp: new Date(Date.now() - 3600000) },
  { type: 'minted', description: 'Minted NFT #1005', timestamp: new Date(Date.now() - 7200000), txHash: '0x123...' },
  { type: 'shared', description: 'Shared campaign to Twitter', timestamp: new Date(Date.now() - 86400000) },
  { type: 'minted', description: 'Minted NFT #1003', timestamp: new Date(Date.now() - 172800000), txHash: '0x456...' },
  { type: 'created', description: 'Created campaign "USDC Gas Explained"', timestamp: new Date(Date.now() - 259200000) },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, address, truncatedAddress, balance } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>('campaigns');
  const [preferences, setPreferences] = useState({
    defaultCampaignType: 'product-launch',
    autoMint: false,
    emailNotifications: false,
  });

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet to access the dashboard');
      navigate('/');
    }
  }, [isConnected, navigate]);

  if (!isConnected) {
    return null;
  }

  const tabs = [
    { id: 'campaigns' as TabType, label: 'My Campaigns', icon: LayoutGrid },
    { id: 'nfts' as TabType, label: 'My NFTs', icon: Image },
    { id: 'activity' as TabType, label: 'Activity', icon: Activity },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Plus className="w-4 h-4 text-primary" />;
      case 'minted':
        return <Coins className="w-4 h-4 text-usdc" />;
      case 'shared':
        return <Share2 className="w-4 h-4 text-cyan" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
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
              <div className="glass rounded-2xl p-6 border border-border/50 sticky top-24">
                {/* User Info */}
                <div className="text-center mb-6">
                  <JazziconAvatar address={address} diameter={64} className="mx-auto mb-3" />
                  <p className="font-medium">{truncatedAddress}</p>
                  <div className="mt-2 p-3 rounded-lg bg-usdc/10 border border-usdc/30">
                    <span className="text-2xl font-display font-bold text-usdc">{balance}</span>
                    <span className="text-sm text-usdc ml-1">USDC</span>
                  </div>
                </div>

                {/* Faucet Link */}
                <Button variant="outline" className="w-full mb-6" asChild>
                  <a
                    href="https://faucet.circle.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                        activeTab === tab.id
                          ? 'bg-primary/10 text-primary border-l-4 border-primary'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
              {/* My Campaigns Tab */}
              {activeTab === 'campaigns' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-bold">My Campaigns</h2>
                    <Button variant="gradient" onClick={() => navigate('/create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Campaign
                    </Button>
                  </div>

                  {mockCampaigns.length === 0 ? (
                    <div className="glass rounded-2xl p-12 text-center border border-border/50">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
                        <LayoutGrid className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-display text-xl font-semibold mb-2">No campaigns yet</h3>
                      <p className="text-muted-foreground mb-6">Create your first campaign to get started</p>
                      <Button variant="gradient" onClick={() => navigate('/create')}>
                        Create Your First Campaign
                      </Button>
                    </div>
                  ) : (
                    <div className="glass rounded-2xl border border-border/50 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border/30">
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Campaign</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Type</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mockCampaigns.map((campaign) => (
                              <tr
                                key={campaign.id}
                                className="border-b border-border/20 hover:bg-secondary/30 transition-colors"
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={campaign.thumbnail}
                                      alt=""
                                      className="w-16 h-10 rounded object-cover"
                                    />
                                    <span className="text-sm line-clamp-1">{campaign.caption}</span>
                                  </div>
                                </td>
                                <td className="p-4 hidden md:table-cell">
                                  <span className="text-sm text-muted-foreground">{campaign.type}</span>
                                </td>
                                <td className="p-4 hidden sm:table-cell">
                                  {campaign.minted ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-usdc/20 text-usdc">
                                      <CheckCircle className="w-3 h-3" />
                                      Minted
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      Not Minted
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 hidden lg:table-cell">
                                  <span className="text-sm text-muted-foreground">
                                    {formatDistanceToNow(campaign.createdAt, { addSuffix: true })}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon">
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                      <Share2 className="w-4 h-4" />
                                    </Button>
                                    {!campaign.minted && (
                                      <Button variant="outline" size="sm">
                                        <Coins className="w-4 h-4 mr-1" />
                                        Mint
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* My NFTs Tab */}
              {activeTab === 'nfts' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-bold">My NFTs</h2>
                    <div className="glass rounded-lg px-4 py-2 border border-usdc/30">
                      <span className="text-sm text-muted-foreground">Total Minted:</span>
                      <span className="ml-2 font-bold text-usdc">{mockNFTs.length} NFTs</span>
                    </div>
                  </div>

                  {mockNFTs.length === 0 ? (
                    <div className="glass rounded-2xl p-12 text-center border border-border/50">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
                        <Image className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-display text-xl font-semibold mb-2">No NFTs yet</h3>
                      <p className="text-muted-foreground">You haven't minted any NFTs yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {mockNFTs.map((nft) => (
                        <motion.div
                          key={nft.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="glass rounded-2xl overflow-hidden border border-border/50 hover:border-primary/50 transition-all duration-300"
                        >
                          <div className="relative">
                            <img
                              src={nft.thumbnail}
                              alt=""
                              className="w-full aspect-video object-cover"
                            />
                            <span className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full bg-usdc/90 text-primary-foreground">
                              Owned
                            </span>
                          </div>
                          <div className="p-4">
                            <p className="text-sm line-clamp-2 mb-2">{nft.caption}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Token #{nft.tokenId}</span>
                              <span>{nft.type}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-bold">Activity</h2>

                  <div className="glass rounded-2xl p-6 border border-border/50">
                    <div className="space-y-6">
                      {mockActivity.map((activity, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-sm">{activity.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                              </span>
                              {activity.txHash && (
                                <a
                                  href={`https://testnet.arcscan.app/tx/${activity.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  View TX <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-bold">Settings</h2>

                  <div className="glass rounded-2xl p-6 border border-border/50 space-y-8">
                    <div>
                      <h3 className="font-semibold mb-4">Preferences</h3>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Default Campaign Type</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Pre-select this type when creating campaigns
                            </p>
                          </div>
                          <Select
                            value={preferences.defaultCampaignType}
                            onValueChange={(value) =>
                              setPreferences({ ...preferences, defaultCampaignType: value })
                            }
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="product-launch">Product Launch</SelectItem>
                              <SelectItem value="community-event">Community Event</SelectItem>
                              <SelectItem value="educational">Educational</SelectItem>
                              <SelectItem value="meme-campaign">Meme Campaign</SelectItem>
                              <SelectItem value="defi-promotion">DeFi Promotion</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Auto-mint on Create</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Automatically mint NFT after campaign generation
                            </p>
                          </div>
                          <Switch
                            checked={preferences.autoMint}
                            onCheckedChange={(checked) =>
                              setPreferences({ ...preferences, autoMint: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Email Notifications</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Receive updates about your campaigns
                            </p>
                          </div>
                          <Switch
                            checked={preferences.emailNotifications}
                            onCheckedChange={(checked) =>
                              setPreferences({ ...preferences, emailNotifications: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border/30">
                      <h3 className="font-semibold mb-4">API Keys</h3>
                      <p className="text-sm text-muted-foreground">
                        API key management coming soon
                      </p>
                    </div>

                    <Button
                      variant="gradient"
                      onClick={() => toast.success('Preferences saved!')}
                    >
                      Save Preferences
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;

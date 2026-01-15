import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ExternalLink, CheckCircle2, Clock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CampaignTemplate {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  target_dapp: string;
  target_contract: string;
  required_event: string;
  min_amount_usd: number;
  redirect_url: string;
  icon_url: string | null;
  is_active: boolean;
}

interface Participation {
  id: string;
  template_id: string;
  verification_status: string;
  verified_at: string | null;
  joined_at: string;
  campaign_id: string | null;
}

const categoryIcons: Record<string, string> = {
  swap: '🔄',
  lp: '💧',
  bridge: '🌉',
};

const categoryColors: Record<string, string> = {
  swap: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  lp: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  bridge: 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
};

export default function Campaigns() {
  const navigate = useNavigate();
  const { address, isConnected, userId } = useWallet();
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningTemplate, setJoiningTemplate] = useState<string | null>(null);
  const [verifyingParticipation, setVerifyingParticipation] = useState<string | null>(null);

  // Fetch templates and participations
  useEffect(() => {
    fetchData();
  }, [address]);

  const fetchData = async () => {
    try {
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('campaign_templates')
        .select('*')
        .eq('is_active', true)
        .order('category');

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Fetch user participations if connected
      if (address) {
        const { data: participationsData, error: participationsError } = await supabase
          .from('campaign_participations')
          .select('*')
          .eq('wallet_address', address.toLowerCase());

        if (participationsError) throw participationsError;
        setParticipations(participationsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCampaign = async (template: CampaignTemplate) => {
    if (!isConnected || !address || !userId) {
      toast.error('Please connect your wallet first');
      return;
    }

    setJoiningTemplate(template.id);

    try {
      // Check if already participating
      const existing = participations.find(p => p.template_id === template.id);
      if (existing) {
        if (existing.verification_status === 'verified') {
          toast.info('Already verified! Redirecting to campaign creation...');
          navigate('/create', { state: { participationId: existing.id, templateId: template.id } });
          return;
        }
        // Open dApp in new tab
        window.open(template.redirect_url, '_blank');
        return;
      }

      // Create participation record
      const { data: participation, error } = await supabase
        .from('campaign_participations')
        .insert({
          user_id: userId,
          wallet_address: address.toLowerCase(),
          template_id: template.id,
          verification_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      setParticipations(prev => [...prev, participation]);
      toast.success(`Joined ${template.name}! Complete the action on ${template.target_dapp}`);

      // Open dApp in new tab
      window.open(template.redirect_url, '_blank');
    } catch (error: any) {
      console.error('Error joining campaign:', error);
      toast.error(error.message || 'Failed to join campaign');
    } finally {
      setJoiningTemplate(null);
    }
  };

  const handleVerifyAction = async (participation: Participation, template: CampaignTemplate) => {
    if (!address) return;

    setVerifyingParticipation(participation.id);

    try {
      const response = await supabase.functions.invoke('verify-action', {
        body: {
          participationId: participation.id,
          walletAddress: address,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;

      if (result.verified) {
        toast.success('Action verified! You can now create your campaign.');
        // Update local state
        setParticipations(prev => prev.map(p => 
          p.id === participation.id 
            ? { ...p, verification_status: 'verified' as const, verified_at: new Date().toISOString() }
            : p
        ));
        // Navigate to campaign creation
        navigate('/create', { state: { participationId: participation.id, templateId: template.id } });
      } else {
        toast.info(result.message || 'Action not verified yet. Complete the required action first.');
      }
    } catch (error: any) {
      console.error('Error verifying action:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setVerifyingParticipation(null);
    }
  };

  const getParticipation = (templateId: string) => {
    return participations.find(p => p.template_id === templateId);
  };

  const getStatusBadge = (participation: Participation | undefined) => {
    if (!participation) return null;

    const status = participation.verification_status;
    
    if (status === 'verified') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (status === 'pending') {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
    if (status === 'failed') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Campaign Templates</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Complete on-chain actions to unlock campaign creation. Choose a template, 
            perform the required action, and verify to start creating.
          </p>
        </motion.div>

        {/* Flow Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 md:gap-4 mb-12"
        >
          {[
            { step: '1', label: 'Select Template' },
            { step: '2', label: 'Go to dApp' },
            { step: '3', label: 'Complete Action' },
            { step: '4', label: 'Verify' },
            { step: '5', label: 'Create Campaign' },
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">
                  {item.step}
                </span>
                <span className="text-sm text-foreground">{item.label}</span>
              </div>
              {index < 4 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 hidden md:block" />
              )}
            </div>
          ))}
        </motion.div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {templates.map((template, index) => {
                const participation = getParticipation(template.id);
                const isVerified = participation?.verification_status === 'verified';
                const isPending = participation?.verification_status === 'pending';
                const isJoining = joiningTemplate === template.id;
                const isVerifying = verifyingParticipation === participation?.id;

                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`relative overflow-hidden border bg-gradient-to-br ${categoryColors[template.category] || 'from-muted/50 to-muted/30 border-border'} hover:border-primary/50 transition-all duration-300`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{categoryIcons[template.category] || '📋'}</span>
                            <div>
                              <CardTitle className="text-xl">{template.name}</CardTitle>
                              <CardDescription className="text-muted-foreground">
                                {template.target_dapp}
                              </CardDescription>
                            </div>
                          </div>
                          {getStatusBadge(participation)}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            Min ${template.min_amount_usd}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {template.category}
                          </Badge>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 space-y-2">
                          {!isConnected ? (
                            <Button className="w-full" variant="outline" disabled>
                              Connect Wallet to Join
                            </Button>
                          ) : isVerified ? (
                            <Button 
                              className="w-full"
                              onClick={() => navigate('/create', { 
                                state: { participationId: participation?.id, templateId: template.id } 
                              })}
                            >
                              Create Campaign
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          ) : isPending ? (
                            <div className="space-y-2">
                              <Button 
                                className="w-full"
                                variant="outline"
                                onClick={() => window.open(template.redirect_url, '_blank')}
                              >
                                Go to {template.target_dapp}
                                <ExternalLink className="w-4 h-4 ml-2" />
                              </Button>
                              <Button 
                                className="w-full"
                                onClick={() => handleVerifyAction(participation!, template)}
                                disabled={isVerifying}
                              >
                                {isVerifying ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Verifying...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Verify My Action
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              className="w-full"
                              onClick={() => handleJoinCampaign(template)}
                              disabled={isJoining}
                            >
                              {isJoining ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Joining...
                                </>
                              ) : (
                                <>
                                  Join Campaign
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {!loading && templates.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              No active campaign templates available.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

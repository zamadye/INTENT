import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Loader2, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DailyTaskSet, 
  DailyTask, 
  DbDApp,
  generateDailyTasks, 
  loadTaskState, 
  saveTaskState,
  getTodayDateString,
  areAllTasksCompleted,
  getTaskContextForCaption,
  fetchDAppsFromDatabase,
  setCachedDapps
} from '@/lib/dailyTasks';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';

interface DailyTasksPanelProps {
  onAllTasksCompleted: (taskContext: ReturnType<typeof getTaskContextForCaption>) => void;
  disabled?: boolean;
}

export function DailyTasksPanel({ onAllTasksCompleted, disabled }: DailyTasksPanelProps) {
  const { address, isConnected, userId } = useWallet();
  const [taskSet, setTaskSet] = useState<DailyTaskSet | null>(null);
  const [dapps, setDapps] = useState<DbDApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);
  const [joinedTasks, setJoinedTasks] = useState<Set<string>>(new Set());

  // Fetch dApps from database on mount
  useEffect(() => {
    const loadDapps = async () => {
      setLoading(true);
      try {
        const fetchedDapps = await fetchDAppsFromDatabase();
        setDapps(fetchedDapps);
        setCachedDapps(fetchedDapps);
      } catch (err) {
        console.error('Failed to fetch dApps:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDapps();
  }, []);

  // Initialize tasks when wallet connects and dApps are loaded
  useEffect(() => {
    if (!address || dapps.length === 0) {
      setTaskSet(null);
      return;
    }

    const today = getTodayDateString();
    const savedState = loadTaskState(address, today, dapps);
    
    if (savedState && savedState.tasks.length > 0) {
      setTaskSet(savedState);
      if (areAllTasksCompleted(savedState)) {
        onAllTasksCompleted(getTaskContextForCaption(savedState));
      }
    } else {
      const newTasks = generateDailyTasks(address, today, 3, dapps);
      setTaskSet(newTasks);
      saveTaskState(newTasks);
    }
  }, [address, dapps, onAllTasksCompleted]);

  // Join task via edge function (server-side validation)
  const handleJoinTask = async (task: DailyTask) => {
    if (!address || !userId || !taskSet) return;

    try {
      // Get session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in to join tasks');
        return;
      }

      // Call edge function for server-side validation
      // Send dappId for arc_dapps table lookup
      const { data, error } = await supabase.functions.invoke('campaign-service/join', {
        body: { dappId: task.dapp.id },
      });

      if (error) {
        // Handle rate limit
        if (error.message?.includes('429') || error.message?.includes('limit')) {
          toast.error('Daily participation limit reached');
          return;
        }
        console.error('Failed to join task:', error);
        toast.error('Failed to join task');
        return;
      }

      if (data?.success) {
        setJoinedTasks(prev => new Set([...prev, task.id]));
        
        // Open dApp in new tab
        if (task.dapp.website_url) {
          window.open(task.dapp.website_url, '_blank');
        }
      }
    } catch (err) {
      console.error('Error joining task:', err);
      toast.error('Failed to join task');
    }
  };

  // Verify task completion
  const handleVerifyTask = async (task: DailyTask, index: number) => {
    if (!address || !taskSet) return;

    setVerifyingTaskId(task.id);

    try {
      // Call verify-action edge function
      const { data, error } = await supabase.functions.invoke('verify-action', {
        body: {
          walletAddress: address,
          dappId: task.dapp.id,
          dappSlug: task.dapp.slug,
          actionVerb: task.actionVerb,
          minAmount: task.minAmount,
          targetContract: task.dapp.target_contract,
        },
      });

      if (error) throw error;

      if (data.verified) {
        // Update task state
        const updatedTasks = [...taskSet.tasks];
        updatedTasks[index] = {
          ...updatedTasks[index],
          completed: true,
          verificationStatus: 'verified',
          verifiedAt: new Date().toISOString(),
          txHash: data.txHash,
        };

        const updatedTaskSet: DailyTaskSet = {
          ...taskSet,
          tasks: updatedTasks,
          allCompleted: updatedTasks.every(t => t.verificationStatus === 'verified'),
        };

        setTaskSet(updatedTaskSet);
        saveTaskState(updatedTaskSet);

        toast.success(`${task.dapp.name} task verified!`);

        // Check if all completed
        if (updatedTaskSet.allCompleted) {
          onAllTasksCompleted(getTaskContextForCaption(updatedTaskSet));
        }
      } else {
        toast.error(data.message || 'Action not found on-chain yet. Please try again.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      toast.error('Verification failed. Please try again.');
    } finally {
      setVerifyingTaskId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading your daily tasks...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected || !taskSet) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-12 text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Connect your wallet to see your daily tasks
          </p>
        </CardContent>
      </Card>
    );
  }

  if (taskSet.tasks.length === 0) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No tasks available right now. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const completedCount = taskSet.tasks.filter(t => t.verificationStatus === 'verified').length;
  const progress = (completedCount / taskSet.tasks.length) * 100;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Your Daily Tasks
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {taskSet.date}
          </Badge>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedCount}/{taskSet.tasks.length} completed</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence mode="popLayout">
          {taskSet.tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                p-4 rounded-lg border transition-all
                ${task.verificationStatus === 'verified' 
                  ? 'bg-primary/10 border-primary/30' 
                  : 'bg-card border-border hover:border-primary/30'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="mt-0.5">
                  {task.verificationStatus === 'verified' ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                {/* Task Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{task.dapp.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {task.dapp.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {task.action}
                  </p>
                  <p className="text-xs text-muted-foreground/70 line-clamp-2">
                    {task.dapp.description}
                  </p>
                  {task.minAmount && (
                    <p className="text-xs text-primary/80 mt-1">
                      Min. amount: ${task.minAmount}
                    </p>
                  )}

                  {/* Action Buttons */}
                  {task.verificationStatus !== 'verified' && (
                    <div className="flex items-center gap-2 mt-3">
                      {!joinedTasks.has(task.id) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleJoinTask(task)}
                          disabled={disabled}
                          className="gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Go to {task.dapp.name}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleVerifyTask(task, index)}
                          disabled={disabled || verifyingTaskId === task.id}
                          className="gap-1"
                        >
                          {verifyingTaskId === task.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              Verify Action
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Verified State */}
                  {task.verificationStatus === 'verified' && task.txHash && (
                    <p className="text-xs text-primary mt-2">
                      ✓ Verified • TX: {task.txHash.slice(0, 10)}...
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* All Completed Message */}
        {taskSet.allCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-center"
          >
            <Sparkles className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="font-semibold text-primary">All Tasks Completed!</p>
            <p className="text-sm text-muted-foreground mt-1">
              You can now generate your campaign caption
            </p>
            <ArrowRight className="w-4 h-4 mx-auto mt-2 text-primary animate-pulse" />
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

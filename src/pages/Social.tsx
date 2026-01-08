import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, Mail, Check, X, Shield, ArrowLeft,
  MapPin, Activity, Trophy, TrendingUp, Calendar,
  Eye, EyeOff, Search, Target, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import BottomNavigation from '@/components/BottomNavigation';

interface Friend {
  id: number;
  email: string;
  username: string;
  avatar_url?: string;
  status: string;
}

interface FriendStats {
  id: number;
  username: string;
  avatarUrl?: string;
  totalDistanceKm: number;
  territoriesOwned: number;
  areaKm2: number;
  totalRuns: number;
  lastRunAt?: string;
}

interface ActivityItem {
  id: string;
  type: 'run' | 'territory_lost';
  userId: number;
  username: string;
  timestamp: string;
  data: any;
}

interface WeeklyComparison {
  userWeeklyDistance: number;
  friendsAvgDistance: number;
  weekStart: string;
}

interface Team {
  id: number;
  name: string;
  description?: string;
  role?: string;
  member_count: number;
  created_by: number;
  creator_name?: string;
}

const Social = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendStats, setFriendStats] = useState<FriendStats[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [weeklyComparison, setWeeklyComparison] = useState<WeeklyComparison | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFriendsOnMap, setShowFriendsOnMap] = useState(false);

  const [friendDialogOpen, setFriendDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        friendsRes,
        statsRes,
        activityRes,
        weeklyRes,
        teamsRes,
        myTeamsRes
      ] = await Promise.all([
        api.get('/friends'),
        api.get('/friends/stats'),
        api.get('/friends/activity'),
        api.get('/friends/weekly-comparison'),
        api.get('/teams'),
        api.get('/teams/my-teams'),
      ]);

      setFriends(friendsRes.friends || []);
      setFriendStats(statsRes.friends || []);
      setActivities(activityRes.activities || []);
      setWeeklyComparison(weeklyRes.comparison);
      setTeams(teamsRes.teams || []);
      setMyTeams(myTeamsRes.teams || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load social data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      if (!friendEmail) {
        toast({
          title: 'Error',
          description: 'Please enter an email address',
          variant: 'destructive',
        });
        return;
      }

      await api.post('/friends/request', { friendEmail });

      toast({
        title: 'Success',
        description: 'Friend request sent!',
      });

      setFriendDialogOpen(false);
      setFriendEmail('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to send friend request',
        variant: 'destructive',
      });
    }
  };

  const handleAcceptFriend = async (friendId: number) => {
    try {
      await api.post(`/friends/accept/${friendId}`);
      toast({
        title: 'Success',
        description: 'Friend request accepted!',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to accept friend request',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    try {
      await api.delete(`/friends/${friendId}`);
      toast({
        title: 'Success',
        description: 'Friend removed',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to remove friend',
        variant: 'destructive',
      });
    }
  };

  const handleCreateTeam = async () => {
    try {
      if (!newTeam.name) {
        toast({
          title: 'Error',
          description: 'Please enter a team name',
          variant: 'destructive',
        });
        return;
      }

      await api.post('/teams', newTeam);

      toast({
        title: 'Success',
        description: 'Team created!',
      });

      setTeamDialogOpen(false);
      setNewTeam({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create team',
        variant: 'destructive',
      });
    }
  };

  const handleJoinTeam = async (teamId: number) => {
    try {
      await api.post(`/teams/${teamId}/join`);
      toast({
        title: 'Success',
        description: 'Joined team successfully!',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to join team',
        variant: 'destructive',
      });
    }
  };

  const handleLeaveTeam = async (teamId: number) => {
    try {
      await api.post(`/teams/${teamId}/leave`);
      toast({
        title: 'Success',
        description: 'Left team successfully',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to leave team',
        variant: 'destructive',
      });
    }
  };

  const formatActivityMessage = (activity: ActivityItem): string => {
    switch (activity.type) {
      case 'run':
        const distance = activity.data.distanceKm.toFixed(1);
        const territories = activity.data.territoriesConquered;
        if (territories > 0) {
          return `🏃 ran ${distance} km and conquered ${territories} area${territories > 1 ? 's' : ''}`;
        }
        return `🏃 ran ${distance} km`;
      case 'territory_lost':
        return `🗺️ conquered an area from you`;
      default:
        return 'Unknown activity';
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  const formatLastActive = (lastRunAt?: string): string => {
    if (!lastRunAt) return 'Never';
    return formatTimeAgo(lastRunAt);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading social data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 pb-24">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">Social</h1>
          <p className="text-white/60 text-sm">Connect with runners & compete</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Weekly Comparison */}
        {weeklyComparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  <CardTitle className="text-white">This Week</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {weeklyComparison.userWeeklyDistance.toFixed(1)} km
                    </div>
                    <div className="text-cyan-400 text-sm">You</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {weeklyComparison.friendsAvgDistance.toFixed(1)} km
                    </div>
                    <div className="text-orange-400 text-sm">Friends Avg</div>
                  </div>
                </div>
                {weeklyComparison.userWeeklyDistance < weeklyComparison.friendsAvgDistance && (
                  <div className="mt-3 text-center">
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-400">
                      🔥 You're behind your friends!
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Friends Layer Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-white font-medium">Show Friends on Map</div>
                    <div className="text-white/60 text-sm">View friends' territories</div>
                  </div>
                </div>
                <Switch
                  checked={showFriendsOnMap}
                  onCheckedChange={setShowFriendsOnMap}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="feed" className="text-white data-[state=active]:bg-white/20">
              Activity
            </TabsTrigger>
            <TabsTrigger value="friends" className="text-white data-[state=active]:bg-white/20">
              Friends
            </TabsTrigger>
            <TabsTrigger value="teams" className="text-white data-[state=active]:bg-white/20">
              Teams
            </TabsTrigger>
          </TabsList>

          {/* Activity Feed */}
          <TabsContent value="feed" className="space-y-4">
            {activities.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-white/40 mx-auto mb-3" />
                    <p className="text-white/60">No recent activity</p>
                    <p className="text-white/40 text-sm">Add friends to see their runs!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {activity.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{activity.username}</span>
                            <span className="text-white/40 text-sm">
                              {formatTimeAgo(activity.timestamp)}
                            </span>
                          </div>
                          <p className="text-white/80">
                            {formatActivityMessage(activity)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            {/* Add Friend Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-white text-lg font-semibold">Friends ({friends.length})</h3>
              <Dialog open={friendDialogOpen} onOpenChange={setFriendDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-500 hover:bg-green-600">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Friend</DialogTitle>
                    <DialogDescription>
                      Send a friend request to connect with other runners.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="email">Friend's Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="friend@example.com"
                        value={friendEmail}
                        onChange={(e) => setFriendEmail(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSendFriendRequest} className="w-full">
                      Send Friend Request
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Friends List */}
            {friends.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-white/40 mx-auto mb-3" />
                    <p className="text-white/60">No friends yet</p>
                    <p className="text-white/40 text-sm">Add friends to start competing!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {friends.map((friend) => {
                  const stats = friendStats.find(s => s.id === friend.id);
                  return (
                    <Card key={friend.id} className="bg-white/5 backdrop-blur-xl border-white/10">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              <span className="text-white font-bold">
                                {friend.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-white font-medium">{friend.username}</div>
                              {stats && (
                                <div className="text-white/60 text-sm">
                                  🏃 {stats.totalDistanceKm.toFixed(1)} km · 🗺️ {stats.territoriesOwned} zones
                                </div>
                              )}
                              {stats?.lastRunAt && (
                                <div className="text-white/40 text-xs">
                                  Last run: {formatLastActive(stats.lastRunAt)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={friend.status === 'accepted' ? 'default' : 'secondary'}
                              className={
                                friend.status === 'accepted'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }
                            >
                              {friend.status === 'accepted' ? 'Friends' : 'Pending'}
                            </Badge>
                            {friend.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 border-green-500/50 text-green-400 hover:bg-green-500/10"
                                  onClick={() => handleAcceptFriend(friend.id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 border-red-500/50 text-red-400 hover:bg-red-500/10"
                                  onClick={() => handleRemoveFriend(friend.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            {friend.status === 'accepted' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                onClick={() => handleRemoveFriend(friend.id)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-4">
            {/* Create Team Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-white text-lg font-semibold">Teams ({myTeams.length})</h3>
              <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-500 hover:bg-purple-600">
                    <Users className="w-4 h-4 mr-2" />
                    Create Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                    <DialogDescription>
                      Create a team to compete together in competitions and share territory conquests.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="teamName">Team Name</Label>
                      <Input
                        id="teamName"
                        placeholder="Running Warriors"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="teamDesc">Description (Optional)</Label>
                      <Input
                        id="teamDesc"
                        placeholder="A team for serious runners"
                        value={newTeam.description}
                        onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <Button onClick={handleCreateTeam} className="w-full">
                      Create Team
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Teams List */}
            {myTeams.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-white/40 mx-auto mb-3" />
                    <p className="text-white/60">No teams yet</p>
                    <p className="text-white/40 text-sm">Create a team to compete with friends!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myTeams.map((team) => (
                  <Card key={team.id} className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{team.name}</div>
                            <div className="text-white/60 text-sm">
                              {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                              {team.role && ` · ${team.role}`}
                            </div>
                            {team.description && (
                              <div className="text-white/40 text-xs mt-1">{team.description}</div>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                          View Team
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Social;

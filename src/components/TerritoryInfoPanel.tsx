import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, MapPin, Calendar, Zap, Trophy, Clock, Users, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

type Territory = {
  id: number;
  run_id: number;
  owner_id: number;
  distance_km: number;
  geojson: {
    type: string;
    geometry: {
      coordinates: number[][][] | number[][];
    };
  };
  created_at?: string;
  owner_name?: string;
  activity_type?: 'run' | 'cycle';
  run_duration?: number;
};

type OverlappingTerritory = {
  run_id: number;
  owner_id: number;
  owner_name: string;
  avatar_url?: string;
  distance_km: number;
  activity_type: string;
  created_at: string;
  duration_sec?: number;
};

type TopPerformer = {
  id: number;
  username: string;
  avatar_url?: string;
  run_count: number;
  total_distance: number;
  avg_distance: number;
  best_pace_sec_per_km?: number;
};

interface TerritoryInfoPanelProps {
  territory: Territory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: number;
}

export default function TerritoryInfoPanel({ 
  territory, 
  open, 
  onOpenChange,
  currentUserId 
}: TerritoryInfoPanelProps) {
  const [overlappingTerritories, setOverlappingTerritories] = useState<OverlappingTerritory[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (territory?.run_id && open) {
      fetchTerritoryDetails();
    }
  }, [territory?.run_id, open]);

  const fetchTerritoryDetails = async () => {
    if (!territory?.run_id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/territories/${territory.run_id}/info`);
      const data = await response.json();
      
      if (data.ok) {
        setOverlappingTerritories(data.overlappingTerritories || []);
        setTopPerformers(data.topPerformers || []);
      }
    } catch (error) {
      console.error('Failed to fetch territory details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!territory) return null;

  const isOwnedByUser = currentUserId && territory.owner_id === currentUserId;

  const calculateArea = (geojson: Territory['geojson']) => {
    const coords = geojson?.geometry?.coordinates?.[0];
    if (!coords) return 0;
    
    const lats = coords.map((c: any) => c[1]);
    const lngs = coords.map((c: any) => c[0]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const avgLat = (minLat + maxLat) / 2;
    
    const latMeters = latDiff * 111320;
    const lngMeters = lngDiff * 111320 * Math.cos(avgLat * Math.PI / 180);
    
    return Math.round(latMeters * lngMeters);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatPace = (secPerKm?: number) => {
    if (!secPerKm) return 'N/A';
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.round(secPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
  };

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  const area = calculateArea(territory.geojson);
  const userRunsHere = overlappingTerritories.filter(t => t.owner_id === currentUserId).length;
  const otherUsersCount = overlappingTerritories.filter(t => t.owner_id !== currentUserId).length > 0 ? 
    new Set(overlappingTerritories.filter(t => t.owner_id !== currentUserId).map(t => t.owner_id)).size : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Territory Details
          </SheetTitle>
          <SheetDescription>
            Complete information about this territory and who else ran here
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)] pb-4">
          {/* Owner Info */}
          {isOwnedByUser && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    This is your territory! 🏆
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                Territory Creator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {territory.owner_name && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                      {territory.owner_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{territory.owner_name || `User #${territory.owner_id}`}</p>
                    {isOwnedByUser && <Badge variant="secondary" className="mt-1">You</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Territory Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Territory Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distance Run:</span>
                <span className="font-semibold text-lg">{territory.distance_km?.toFixed(2) || 'N/A'} km</span>
              </div>
              {territory.run_duration && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Taken:
                  </span>
                  <span className="font-semibold">{formatDuration(territory.run_duration)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Area Covered:</span>
                <span className="font-semibold">{area.toLocaleString()} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activity Type:</span>
                <Badge variant="secondary">
                  {territory.activity_type === 'cycle' ? '🚴 Cycling' : '🏃 Running'}
                </Badge>
              </div>
              {territory.created_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Created:
                  </span>
                  <span className="font-semibold text-sm">
                    {new Date(territory.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('activity')}>
                <Users className="w-4 h-4" />
                Activity in This Area
                <span className="ml-auto text-sm font-normal">{expandedSections.has('activity') ? '▼' : '▶'}</span>
              </CardTitle>
            </CardHeader>
            {expandedSections.has('activity') && (
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between text-blue-900 dark:text-blue-100">
                  <span>Recent runs nearby:</span>
                  <span className="font-bold">{overlappingTerritories.length}</span>
                </div>
                {userRunsHere > 0 && (
                  <div className="flex justify-between text-blue-900 dark:text-blue-100">
                    <span>Times you ran here:</span>
                    <span className="font-bold text-green-600">{userRunsHere}</span>
                  </div>
                )}
                {otherUsersCount > 0 && (
                  <div className="flex justify-between text-blue-900 dark:text-blue-100">
                    <span>Other runners:</span>
                    <span className="font-bold">{otherUsersCount}</span>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Top Performers */}
          {topPerformers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('performers'}>
                  <TrendingUp className="w-4 h-4" />
                  Top Performers (Last 30 Days)
                  <span className="ml-auto text-sm font-normal">{expandedSections.has('performers') ? '▼' : '▶'}</span>
                </CardTitle>
              </CardHeader>
              {expandedSections.has('performers') && (
                <CardContent>
                  <div className="space-y-3">
                    {topPerformers.map((performer, idx) => (
                      <div key={performer.id} className="flex items-center justify-between pb-3 border-b last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-bold text-muted-foreground w-6 text-center">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                            {performer.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{performer.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {performer.run_count} run{performer.run_count !== 1 ? 's' : ''} • {performer.total_distance.toFixed(1)} km
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{performer.total_distance.toFixed(1)} km</p>
                          {performer.best_pace_sec_per_km && (
                            <p className="text-xs text-muted-foreground">
                              {formatPace(performer.best_pace_sec_per_km)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Other Runners Here */}
          {overlappingTerritories.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 cursor-pointer" onClick={() => toggleSection('others')}>
                  <Users className="w-4 h-4" />
                  Who Else Ran Here
                  <span className="ml-auto text-sm font-normal">{expandedSections.has('others') ? '▼' : '▶'}</span>
                </CardTitle>
              </CardHeader>
              {expandedSections.has('others') && (
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {overlappingTerritories.slice(0, 15).map((run, idx) => (
                      <div key={`${run.run_id}-${idx}`} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-sm">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                            {run.owner_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{run.owner_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {run.distance_km.toFixed(1)} km • {run.activity_type === 'cycle' ? '🚴' : '🏃'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {new Date(run.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    ))}
                    {overlappingTerritories.length > 15 && (
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        +{overlappingTerritories.length - 15} more runners
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                {isOwnedByUser 
                  ? '🌟 This territory was created from your epic run!'
                  : '🏃 Run in this area to add your own territory!'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

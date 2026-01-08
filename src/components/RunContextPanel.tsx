import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, MapPin, Clock, Trophy, Users, TrendingUp, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';

interface GPSPoint {
  lat: number;
  lng: number;
  timestamp?: number;
}

interface Territory {
  tile_id: string;
  owner_id: number;
  owner_name: string;
  last_claimed: string;
  claim_count: number;
}

interface PersonalBest {
  runId: number;
  distanceKm: number;
  durationSec: number;
  paceMinPerKm: number;
  date: string;
}

interface HistoryItem {
  tile_id: string;
  old_owner_name: string | null;
  new_owner_name: string;
  changed_at: string;
}

interface TerritoryContext {
  territories: Territory[];
  personalBest: PersonalBest | null;
  timesRunHere: number;
  history: HistoryItem[];
}

interface RunContextPanelProps {
  currentPosition: GPSPoint | null;
  isRunning: boolean;
  isPaused?: boolean;
  currentUserId?: number;
}

const RunContextPanel = ({ currentPosition, isRunning, isPaused = false, currentUserId }: RunContextPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<TerritoryContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragY, setDragY] = useState(0);

  // Fetch territory context when position changes
  useEffect(() => {
    if (currentPosition && isOpen) {
      fetchContext();
    }
  }, [currentPosition?.lat, currentPosition?.lng, isOpen]);

  const fetchContext = async () => {
    if (!currentPosition) return;

    setLoading(true);
    try {
      const response = await api.post('/territories/context', {
        lat: currentPosition.lat,
        lng: currentPosition.lng,
      });

      setContext(response);
    } catch (error) {
      console.error('Failed to fetch territory context:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (paceMinPerKm: number): string => {
    const minutes = Math.floor(paceMinPerKm);
    const seconds = Math.floor((paceMinPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.y > 100) {
      setIsOpen(false);
    }
  };

  // Show panel when: not running yet, or paused, or after run ends
  const shouldShow = !isRunning || isPaused;
  
  if (!shouldShow) return null;

  const currentTerritory = context?.territories?.[0];
  const isOwnTerritory = currentTerritory?.owner_id === currentUserId;

  return (
    <>
      {/* Swipe Up Indicator - only when paused or before/after run */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[400]"
          onClick={() => setIsOpen(true)}
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 flex items-center gap-2 text-white text-sm cursor-pointer hover:bg-white/20 transition-colors">
            <ChevronUp className="w-4 h-4 animate-bounce" />
            <span>Swipe up for territory info</span>
            <ChevronUp className="w-4 h-4 animate-bounce" />
          </div>
        </motion.div>
      )}

      {/* Slide-Up Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[450]"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="absolute bottom-0 left-0 right-0 z-[500] max-h-[70vh] overflow-y-auto"
              style={{ y: dragY }}
            >
              <div className="bg-gradient-to-b from-gray-900 to-black rounded-t-3xl shadow-2xl border-t-2 border-cyan-500/50">
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1.5 bg-white/30 rounded-full" />
                </div>

                {/* Content */}
                <div className="px-4 pb-6 space-y-4">
                  {/* Header */}
                  <div className="text-center pb-2 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                      <MapPin className="w-5 h-5 text-cyan-400" />
                      Territory Context
                    </h3>
                    <p className="text-sm text-white/60 mt-1">
                      {currentTerritory ? 'Territory found nearby' : 'Unexplored territory'}
                    </p>
                  </div>

                  {loading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-white/60 text-sm mt-3">Loading territory data...</p>
                    </div>
                  ) : context ? (
                    <div className="space-y-3">
                      {/* Current Territory Owner */}
                      {currentTerritory && (
                        <Card className="bg-white/5 border-white/10 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-cyan-400" />
                                <span className="text-sm text-white/60">Current Owner</span>
                              </div>
                              <div className={`text-lg font-bold ${
                                isOwnTerritory ? 'text-green-400' : 'text-orange-400'
                              }`}>
                                {isOwnTerritory ? '👑 You' : `🏃 ${currentTerritory.owner_name}`}
                              </div>
                              <div className="text-xs text-white/60 mt-1">
                                Claimed {formatDate(currentTerritory.last_claimed)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-white">
                                {currentTerritory.claim_count}
                              </div>
                              <div className="text-xs text-white/60">
                                times conquered
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Personal Best in This Area */}
                      {context.personalBest && (
                        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30 p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-yellow-500/20 rounded-lg p-2">
                              <Trophy className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-yellow-400 font-semibold mb-1">
                                Your Personal Best Here
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <div className="text-white/60">Distance</div>
                                  <div className="text-white font-bold">
                                    {parseFloat(context.personalBest.distanceKm).toFixed(2)} km
                                  </div>
                                </div>
                                <div>
                                  <div className="text-white/60">Time</div>
                                  <div className="text-white font-bold">
                                    {formatTime(context.personalBest.durationSec)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-white/60">Pace</div>
                                  <div className="text-white font-bold">
                                    {formatPace(context.personalBest.paceMinPerKm)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-white/60 mt-2">
                                {formatDate(context.personalBest.date)}
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Times Run Here */}
                      {context.timesRunHere > 0 && (
                        <Card className="bg-white/5 border-white/10 p-4">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            <div>
                              <p className="text-sm text-white/60">You've run here</p>
                              <p className="text-xl font-bold text-white">
                                {context.timesRunHere} time{context.timesRunHere > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Recent Territory History */}
                      {context.history.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-white/60" />
                            <span className="text-sm text-white/60 font-semibold">Recent History</span>
                          </div>
                          <div className="space-y-2">
                            {context.history.slice(0, 5).map((item, idx) => (
                              <Card key={idx} className="bg-white/5 border-white/10 p-3">
                                <div className="flex items-center justify-between text-xs">
                                  <div>
                                    <span className="text-white/60">
                                      {item.old_owner_name || 'Unclaimed'}
                                    </span>
                                    <span className="text-white/40 mx-2">→</span>
                                    <span className="text-cyan-400 font-semibold">
                                      {item.new_owner_name}
                                    </span>
                                  </div>
                                  <span className="text-white/40">
                                    {formatDate(item.changed_at)}
                                  </span>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No Data State */}
                      {!currentTerritory && context.timesRunHere === 0 && (
                        <div className="text-center py-8">
                          <MapPin className="w-12 h-12 text-white/20 mx-auto mb-3" />
                          <p className="text-white/60 text-sm">
                            This is unexplored territory!
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            Be the first to claim it
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-white/60 text-sm">
                        Tap to load territory information
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default RunContextPanel;

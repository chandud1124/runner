import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Clock, MapPin, Trophy, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TerritoryClickInfo {
  tile_id: string;
  owner_id: number;
  owner_name: string;
  last_claimed: string;
  claim_count: number;
  distance_km?: number;
  duration_sec?: number;
  user_best_time?: number | null;
  user_best_distance?: number | null;
}

interface TerritoryClickPopupProps {
  territory: TerritoryClickInfo | null;
  onClose: () => void;
  currentUserId?: number;
}

const TerritoryClickPopup = ({ territory, onClose, currentUserId }: TerritoryClickPopupProps) => {
  if (!territory) return null;

  const isOwnTerritory = territory.owner_id === currentUserId;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (seconds: number, km: number): string => {
    const paceMinPerKm = (seconds / 60) / km;
    const minutes = Math.floor(paceMinPerKm);
    const secs = Math.floor((paceMinPerKm - minutes) * 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}/km`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const timeDifference = territory.user_best_time && territory.duration_sec
    ? territory.user_best_time - territory.duration_sec
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card className="bg-gradient-to-br from-gray-900 to-black border-cyan-500/50 text-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold">Territory Info</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white/70 hover:text-white h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Owner Info */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-white/60">Owner</span>
                </div>
                <p className={`text-xl font-bold ${
                  isOwnTerritory ? 'text-green-400' : 'text-orange-400'
                }`}>
                  {isOwnTerritory ? '👑 You' : `🏃 ${territory.owner_name}`}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  Claimed {formatDate(territory.last_claimed)}
                </p>
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <TrendingUp className="w-4 h-4 text-white/60" />
                  <span className="text-white/80">
                    Conquered <span className="font-bold text-white">{territory.claim_count}</span> times
                  </span>
                </div>
              </div>

              {/* Owner's Stats */}
              {territory.duration_sec && territory.distance_km && (
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-400 font-semibold">
                      {isOwnTerritory ? 'Your' : `${territory.owner_name}'s`} Stats
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-white/60 text-xs">Distance</div>
                      <div className="text-white font-bold text-lg">
                        {territory.distance_km.toFixed(2)} km
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">Time</div>
                      <div className="text-white font-bold text-lg">
                        {formatTime(territory.duration_sec)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-white/60 text-xs">Pace</div>
                      <div className="text-white font-bold text-lg">
                        {formatPace(territory.duration_sec, territory.distance_km)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* User's Personal Best Comparison */}
              {territory.user_best_time && territory.user_best_distance && !isOwnTerritory && (
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400 font-semibold">Your Best Here</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-white/60 text-xs">Distance</div>
                      <div className="text-white font-bold">
                        {territory.user_best_distance.toFixed(2)} km
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">Time</div>
                      <div className="text-white font-bold">
                        {formatTime(territory.user_best_time)}
                      </div>
                    </div>
                  </div>

                  {/* Comparison */}
                  {timeDifference !== null && territory.duration_sec && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-xs text-white/60 mb-1">Comparison</div>
                      {timeDifference > 0 ? (
                        <div className="text-green-400 font-semibold text-sm">
                          ⚡ You were {Math.abs(timeDifference)}s faster!
                        </div>
                      ) : timeDifference < 0 ? (
                        <div className="text-red-400 font-semibold text-sm">
                          🎯 They were {Math.abs(timeDifference)}s faster
                        </div>
                      ) : (
                        <div className="text-white font-semibold text-sm">
                          🤝 Same time!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* No personal record */}
              {!territory.user_best_time && !isOwnTerritory && (
                <div className="text-center py-3 text-white/60 text-sm">
                  <MapPin className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p>You haven't run here yet</p>
                  <p className="text-xs mt-1">Conquer this territory to set your record!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <Button
                onClick={onClose}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                Close
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TerritoryClickPopup;

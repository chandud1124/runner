import { useRef, useEffect, useState } from 'react';
import { Share2, Download, Copy, X, MapPin, Clock, Route, Zap, Mountain, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MapContainer, TileLayer, Polyline, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';

interface GPSPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface RunSummaryExportProps {
  distance: number;
  time: string;
  pace: string;
  territoriesClaimed: number;
  speed: number;
  elevation?: number;
  activityType: 'run' | 'cycle';
  gpsPoints?: GPSPoint[];
  capturedTerritory?: any; // GeoJSON polygon of captured territory
  onClose: () => void;
}

const RunSummaryExport = ({
  distance,
  time,
  pace,
  territoriesClaimed,
  speed,
  elevation,
  activityType,
  gpsPoints = [],
  capturedTerritory,
  onClose,
}: RunSummaryExportProps) => {
  const { toast } = useToast();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate map bounds from GPS points
  const getMapBounds = () => {
    if (gpsPoints.length === 0) return null;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    gpsPoints.forEach(point => {
      minLat = Math.min(minLat, point.lat);
      maxLat = Math.max(maxLat, point.lat);
      minLng = Math.min(minLng, point.lng);
      maxLng = Math.max(maxLng, point.lng);
    });
    
    // Add padding
    const latPadding = (maxLat - minLat) * 0.15;
    const lngPadding = (maxLng - minLng) * 0.15;
    
    return {
      center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2] as [number, number],
      bounds: [
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding]
      ] as [[number, number], [number, number]]
    };
  };

  const mapData = getMapBounds();
  const routeCoords = gpsPoints.map(p => [p.lat, p.lng] as [number, number]);

  const generateSummaryText = () => {
    const emoji = activityType === 'run' ? '🏃' : '🚴';
    return `${emoji} Territory ${activityType} completed!
  
⏱️ Time: ${time}
📏 Distance: ${distance.toFixed(2)} km
🗺️ Territory Claimed: ${territoriesClaimed}
⚡ Avg Speed: ${speed.toFixed(1)} km/h
⏱️ Pace: ${pace}/km
  
Conquering the world one run at a time! 🌍
#TerritoryRunner #Running #Fitness`;
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateSummaryText());
      toast({
        title: 'Copied!',
        description: 'Summary copied to clipboard',
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadScreenshot = async () => {
    if (!exportRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `territory-run-${new Date().toISOString().slice(0,10)}.png`;
      link.click();
      
      toast({
        title: 'Downloaded!',
        description: 'Your run summary has been saved',
      });
    } catch (err) {
      console.error('Screenshot failed:', err);
      toast({
        title: 'Export Failed',
        description: 'Could not generate image',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareToStrava = () => {
    const summary = generateSummaryText();
    const intent = `https://www.strava.com/mobile/post?message=${encodeURIComponent(summary)}`;
    window.open(intent, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Territory Run',
          text: generateSummaryText(),
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  // Format pace with /km suffix
  const formatPace = (p: string) => {
    if (p === '--:--') return p;
    return `${p}/km`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      {/* Strava-style Export Card */}
      <div 
        ref={exportRef}
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl overflow-hidden shadow-2xl relative"
      >
        {/* Close button - outside export area */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors backdrop-blur"
          style={{ transform: 'translate(50%, -50%)' }}
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Map Section with Route */}
        <div className="relative h-56 bg-slate-800">
          {mapData && gpsPoints.length > 1 ? (
            <MapContainer
              center={mapData.center}
              bounds={mapData.bounds}
              className="h-full w-full"
              zoomControl={false}
              attributionControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              touchZoom={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {/* Captured Territory */}
              {capturedTerritory && (
                <Polygon
                  positions={capturedTerritory}
                  pathOptions={{
                    color: '#06b6d4',
                    fillColor: '#06b6d4',
                    fillOpacity: 0.3,
                    weight: 2,
                  }}
                />
              )}
              {/* Run Route */}
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: '#f97316',
                  weight: 4,
                  opacity: 1,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Start marker */}
              {routeCoords.length > 0 && (
                <Polyline
                  positions={[routeCoords[0], routeCoords[0]]}
                  pathOptions={{
                    color: '#22c55e',
                    weight: 12,
                    opacity: 1,
                  }}
                />
              )}
              {/* End marker */}
              {routeCoords.length > 1 && (
                <Polyline
                  positions={[routeCoords[routeCoords.length - 1], routeCoords[routeCoords.length - 1]]}
                  pathOptions={{
                    color: '#ef4444',
                    weight: 12,
                    opacity: 1,
                  }}
                />
              )}
            </MapContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-cyan-500/50 mx-auto mb-2" />
                <p className="text-white/40 text-sm">Route Map</p>
              </div>
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
          
          {/* Activity type badge */}
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2">
            <span className="text-lg">{activityType === 'run' ? '🏃' : '🚴'}</span>
            <span className="text-white/90 text-sm font-medium capitalize">{activityType}</span>
          </div>
        </div>

        {/* Main Stats - Transparent Glass Cards */}
        <div className="px-5 -mt-6 relative z-10">
          {/* Primary Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Distance - Hero stat */}
            <div className="col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Route className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">Distance</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white tracking-tight">{distance.toFixed(2)}</span>
                <span className="text-xl text-white/60 font-medium">km</span>
              </div>
            </div>

            {/* Time */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">Time</span>
              </div>
              <div className="text-2xl font-bold text-white font-mono tracking-tight">
                {time}
              </div>
            </div>

            {/* Pace */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">Pace</span>
              </div>
              <div className="text-2xl font-bold text-white font-mono tracking-tight">
                {formatPace(pace)}
              </div>
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            {/* Avg Speed */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-3 border border-white/10 text-center">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Speed</div>
              <div className="text-lg font-bold text-blue-400">{speed.toFixed(1)}</div>
              <div className="text-xs text-white/40">km/h</div>
            </div>

            {/* Territory Claimed */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-3 border border-cyan-500/30 text-center">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Territory</div>
              <div className="text-lg font-bold text-cyan-400">{territoriesClaimed}</div>
              <div className="text-xs text-white/40">tiles</div>
            </div>

            {/* Elevation or placeholder */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-3 border border-white/10 text-center">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                {elevation !== undefined ? 'Elev' : 'Calories'}
              </div>
              <div className="text-lg font-bold text-purple-400">
                {elevation !== undefined ? `+${elevation.toFixed(0)}` : Math.round(distance * 60)}
              </div>
              <div className="text-xs text-white/40">
                {elevation !== undefined ? 'm' : 'kcal'}
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Banner */}
        {territoriesClaimed > 0 && (
          <div className="mx-5 mt-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-4 border border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/30 rounded-full flex items-center justify-center">
                <Flag className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-white font-semibold">Territory Conquered!</div>
                <div className="text-cyan-300/70 text-sm">
                  {territoriesClaimed} new tile{territoriesClaimed > 1 ? 's' : ''} claimed
                </div>
              </div>
            </div>
          </div>
        )}

        {/* App Branding */}
        <div className="text-center py-4 mt-2">
          <div className="text-white/30 text-xs">
            🗺️ Territory Runner
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 pt-0 space-y-2">
          {/* Primary Action - Strava */}
          <Button
            onClick={handleShareToStrava}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl py-6 transition-all flex items-center justify-center gap-2 font-semibold text-base"
          >
            <Share2 className="w-5 h-5" />
            Share to Strava
          </Button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleDownloadScreenshot}
              disabled={isExporting}
              className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-xl py-4 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Saving...' : 'Save'}
            </Button>
            
            <Button
              onClick={handleCopyToClipboard}
              className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-xl py-4 transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy
            </Button>
          </div>

          {/* Native Share (if available) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button
              onClick={handleNativeShare}
              className="w-full bg-white/5 hover:bg-white/10 text-white/70 border-0 rounded-xl py-3 transition-all text-sm"
            >
              More sharing options...
            </Button>
          )}

          {/* Done */}
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl py-5 transition-all font-semibold mt-3"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RunSummaryExport;

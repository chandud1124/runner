import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '@/lib/api';
import { Download, Calendar, Timer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';

type RunData = {
  id: number;
  user_id: number;
  geojson: {
    type: 'Feature';
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
  };
  raw_points?: Array<{
    lat: number;
    lng: number;
    timestamp: number;
  }>;
  distance_km: number;
  duration_sec: number;
  created_at: string;
};

// Smooth, organic polygon style - Strava/InvTL inspired
const getSmoothPolygonStyle = (color: string = '#FF4757') => ({
  fillColor: color,
  color: color,
  weight: 3,
  opacity: 0.9,
  fillOpacity: 0.25,
  className: 'smooth-territory-polygon',
  smoothFactor: 2.0,
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
});

// GPS path line style
const getPathLineStyle = (color: string = '#FF4757') => ({
  color: color,
  weight: 4,
  opacity: 0.8,
  className: 'gps-path-line',
  smoothFactor: 1.5,
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
});

// Auto-fit map to show run
function MapBoundsHandler({ bounds }: { bounds: [[number, number], [number, number]] | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds && map) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);

  return null;
}

// Format duration
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Calculate pace (min/km)
const calculatePace = (distanceKm: number, durationSec: number) => {
  const paceSeconds = durationSec / distanceKm;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

type SmoothTerritoryMapProps = {
  runId?: number;
  runData?: RunData;
  showStats?: boolean;
  showPath?: boolean;
  territoryColor?: string;
  mapStyle?: 'dark' | 'light' | 'satellite';
  exportMode?: boolean;
};

const SmoothTerritoryMap = ({
  runId,
  runData: initialRunData,
  showStats = true,
  showPath = true,
  territoryColor = '#FF4757',
  mapStyle = 'dark',
  exportMode = false,
}: SmoothTerritoryMapProps) => {
  const [runData, setRunData] = useState<RunData | null>(initialRunData || null);
  const [loading, setLoading] = useState(!initialRunData);
  const [bounds, setBounds] = useState<[[number, number], [number, number]] | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (initialRunData) {
      setRunData(initialRunData);
      calculateBounds(initialRunData);
      return;
    }

    if (!runId) return;

    (async () => {
      try {
        const data = await apiFetch(`/runs/${runId}`);
        setRunData(data.run);
        calculateBounds(data.run);
      } catch (err) {
        console.error('Failed to load run:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [runId, initialRunData]);

  const calculateBounds = (run: RunData) => {
    const coords = run.geojson?.geometry?.coordinates?.[0] || [];
    if (coords.length === 0) return;

    const lats = coords.map(([_, lat]) => lat);
    const lngs = coords.map(([lng, _]) => lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    setBounds([
      [minLat, minLng],
      [maxLat, maxLng],
    ]);
  };

  const exportImage = async (transparent: boolean = false) => {
    const mapElement = document.querySelector('.smooth-territory-map-container') as HTMLElement;
    if (!mapElement) return;

    try {
      const canvas = await html2canvas(mapElement, {
        backgroundColor: transparent ? null : '#1a1a1a',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `run-${runData?.id || 'territory'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading run data...</div>
      </div>
    );
  }

  if (!runData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-white">No run data available</div>
      </div>
    );
  }

  // Get polygon coordinates (buffered territory)
  const territoryCoords = runData.geojson?.geometry?.coordinates?.[0] || [];
  const territoryPositions: LatLngExpression[] = territoryCoords.map(([lng, lat]) => [lat, lng]);

  // Get GPS path (raw points)
  const pathPositions: LatLngExpression[] = runData.raw_points
    ? runData.raw_points.map((p) => [p.lat, p.lng])
    : [];

  // Calculate center for initial view
  const center: [number, number] = bounds
    ? [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
    : [37.7749, -122.4194];

  // Map tile URLs
  const tileUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  return (
    <div className="smooth-territory-map-container w-full h-full relative">
      {/* Global CSS for glow effects */}
      <style>{`
        .smooth-territory-polygon {
          filter: drop-shadow(0 0 8px ${territoryColor}40) drop-shadow(0 0 16px ${territoryColor}20);
          transition: all 0.3s ease;
        }
        .smooth-territory-polygon:hover {
          filter: drop-shadow(0 0 12px ${territoryColor}60) drop-shadow(0 0 24px ${territoryColor}30);
        }
        .gps-path-line {
          filter: drop-shadow(0 0 4px ${territoryColor}80);
        }
        .leaflet-container {
          background: ${mapStyle === 'dark' ? '#0a0a0a' : '#f0f0f0'};
        }
      `}</style>

      {/* Export Controls */}
      {!exportMode && (
        <div className="absolute top-4 right-4 z-[1000] flex gap-2">
          <Button
            onClick={() => exportImage(false)}
            className="bg-white/90 hover:bg-white text-gray-900 shadow-lg"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => exportImage(true)}
            className="bg-white/90 hover:bg-white text-gray-900 shadow-lg"
            size="sm"
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Transparent
          </Button>
        </div>
      )}

      {/* Stats Overlay */}
      {showStats && (
        <div className="absolute bottom-6 left-6 z-[1000] bg-black/80 backdrop-blur-lg rounded-2xl px-6 py-4 shadow-2xl border border-white/10">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-gray-400 text-xs">Distance</div>
                <div className="text-white text-xl font-bold">
                  {(typeof runData.distance_km === 'number' ? runData.distance_km : parseFloat(runData.distance_km)).toFixed(2)} km
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Timer className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-gray-400 text-xs">Time</div>
                <div className="text-white text-xl font-bold">
                  {formatDuration(runData.duration_sec)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-gray-400 text-xs">Pace</div>
                <div className="text-white text-xl font-bold">
                  {calculatePace(runData.distance_km, runData.duration_sec)} /km
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-gray-400 text-xs">Date</div>
                <div className="text-white text-sm font-bold">
                  {new Date(runData.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={center}
        zoom={15}
        className="w-full h-full"
        zoomControl={!exportMode}
        style={{ minHeight: '400px' }}
        ref={mapRef}
      >
        <TileLayer
          url={tileUrls[mapStyle]}
          attribution={
            mapStyle === 'dark'
              ? '&copy; <a href="https://carto.com/">CARTO</a>'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }
          maxZoom={19}
        />

        {/* Smooth Territory Polygon (Buffered Area) */}
        {territoryPositions.length > 0 && (
          <Polygon
            positions={territoryPositions}
            pathOptions={getSmoothPolygonStyle(territoryColor)}
          />
        )}

        {/* GPS Path Line (Original Route) */}
        {showPath && pathPositions.length > 0 && (
          <Polyline
            positions={pathPositions}
            pathOptions={getPathLineStyle(territoryColor)}
          />
        )}

        {/* Auto-fit bounds */}
        <MapBoundsHandler bounds={bounds} />
      </MapContainer>
    </div>
  );
};

export default SmoothTerritoryMap;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Palette, Map as MapIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import SmoothTerritoryMap from '@/components/SmoothTerritoryMap';
import BottomNavigation from '@/components/BottomNavigation';

const RunVisualization = () => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [runData, setRunData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [territoryColor, setTerritoryColor] = useState('#FF4757');
  const [mapStyle, setMapStyle] = useState<'dark' | 'light' | 'satellite'>('dark');
  const [showPath, setShowPath] = useState(true);
  const [showStats, setShowStats] = useState(true);

  const colorPresets = [
    { name: 'Red', value: '#FF4757' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Yellow', value: '#EAB308' },
  ];

  useEffect(() => {
    if (!runId) return;

    (async () => {
      try {
        const data = await apiFetch(`/runs/${runId}`);
        setRunData(data.run);
      } catch (err) {
        console.error('Failed to load run:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [runId]);

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading visualization...</div>
      </div>
    );
  }

  if (!runData) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Run not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-lg border-b border-white/10 px-4 py-3 flex items-center justify-between z-[1001]">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-white font-bold text-lg">Run Visualization</h1>

        <div className="w-20" /> {/* Spacer for centering */}
      </div>

      {/* Control Panel */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/70 backdrop-blur-lg border-b border-white/10 px-4 py-3 z-[1000]"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Color Picker */}
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-gray-400" />
            <div className="flex gap-1">
              {colorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setTerritoryColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    territoryColor === color.value
                      ? 'border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Map Style Selector */}
          <div className="flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-gray-400" />
            <div className="flex gap-1">
              {(['dark', 'light', 'satellite'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setMapStyle(style)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    mapStyle === style
                      ? 'bg-white/20 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPath}
                onChange={(e) => setShowPath(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-300">Show Path</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showStats}
                onChange={(e) => setShowStats(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-300">Show Stats</span>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Map Visualization */}
      <div className="flex-1 relative">
        <SmoothTerritoryMap
          runData={runData}
          showStats={showStats}
          showPath={showPath}
          territoryColor={territoryColor}
          mapStyle={mapStyle}
        />
      </div>

      <BottomNavigation />
    </div>
  );
};

export default RunVisualization;

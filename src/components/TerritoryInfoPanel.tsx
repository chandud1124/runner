import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, MapPin, Calendar, Zap, Trophy } from 'lucide-react';

type Territory = {
  tile_id: string;
  owner_id: number;
  strength: number;
  geojson: {
    type: string;
    coordinates: number[][][];
  };
  last_claimed?: string;
  owner_name?: string;
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
  if (!territory) return null;

  const isOwnedByUser = currentUserId && territory.owner_id === currentUserId;

  const calculateArea = (geojson: Territory['geojson']) => {
    // Simple approximation: calculate bounding box area
    if (!geojson.coordinates || !geojson.coordinates[0]) return 0;
    
    const coords = geojson.coordinates[0];
    const lats = coords.map(([lng, lat]) => lat);
    const lngs = coords.map(([lng, lat]) => lng);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Rough area calculation in square meters
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const avgLat = (minLat + maxLat) / 2;
    
    // Convert to meters
    const latMeters = latDiff * 111320;
    const lngMeters = lngDiff * 111320 * Math.cos(avgLat * Math.PI / 180);
    
    return Math.round(latMeters * lngMeters);
  };

  const area = calculateArea(territory.geojson);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Territory Details
          </SheetTitle>
          <SheetDescription>
            Information about this claimed territory
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(60vh-120px)]">
          {isOwnedByUser && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    This is your territory!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                Owner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="font-medium text-lg">
                  {territory.owner_name || `User #${territory.owner_id}`}
                </span>
                {isOwnedByUser && <Badge variant="secondary">You</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Territory Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Strength:</span>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {territory.strength}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Area:</span>
                <span className="font-semibold">{area.toLocaleString()} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tile ID:</span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {territory.tile_id}
                </span>
              </div>
            </CardContent>
          </Card>

          {territory.last_claimed && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Last Claimed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {new Date(territory.last_claimed).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                {isOwnedByUser 
                  ? 'Keep running to maintain and strengthen your control!'
                  : 'Run through this territory to claim it for yourself!'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

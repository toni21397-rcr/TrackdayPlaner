import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { Track } from "@shared/schema";

export default function MapPage() {
  const { data: tracks, isLoading } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Map Overview</h1>
          <p className="text-muted-foreground">
            View all your tracks and routes on the map
          </p>
        </div>

        {!isLoading && tracks && tracks.length > 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <div className="text-center space-y-2">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Map visualization would appear here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tracks.length} track{tracks.length !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={MapPin}
            title="No tracks to display"
            description="Add tracks to see them on the map."
          />
        )}

        {tracks && tracks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracks.map((track) => (
              <Card key={track.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">{track.name}</div>
                      <div className="text-sm text-muted-foreground">{track.country}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

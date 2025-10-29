import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MapPin, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { TrackDialog } from "@/components/track-dialog";
import type { Track } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Tracks() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const { toast } = useToast();

  const { data: tracks, isLoading } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  const seedTracksMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/seed-tracks", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      toast({
        title: "Tracks seeded successfully!",
        description: `Added ${data.added} tracks, skipped ${data.skipped} existing tracks.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to seed tracks",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold">Tracks</h1>
            <p className="text-muted-foreground">
              Manage your race track locations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => seedTracksMutation.mutate()}
              disabled={seedTracksMutation.isPending}
              data-testid="button-seed-tracks"
            >
              <Database className="w-4 h-4 mr-2" />
              {seedTracksMutation.isPending ? "Seeding..." : "Load Tracks Database"}
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-track">
              <Plus className="w-4 h-4 mr-2" />
              Add Track
            </Button>
          </div>
        </div>

        {/* Tracks Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tracks && tracks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tracks.map((track) => (
              <Card
                key={track.id}
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => setEditingTrack(track)}
                data-testid={`card-track-${track.id}`}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{track.name}</h3>
                      <p className="text-sm text-muted-foreground">{track.country}</p>
                    </div>
                    <div className="p-2 rounded-md bg-primary/10">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-sm font-mono text-muted-foreground">
                    {track.lat.toFixed(4)}, {track.lng.toFixed(4)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MapPin}
            title="No tracks yet"
            description="Add your first race track to start planning trackdays."
            actionLabel="Add Track"
            onAction={() => setIsAddDialogOpen(true)}
          />
        )}
      </div>

      <TrackDialog
        open={isAddDialogOpen || editingTrack !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingTrack(null);
          }
        }}
        track={editingTrack || undefined}
      />
    </div>
  );
}

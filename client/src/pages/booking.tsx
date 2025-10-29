import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { Track } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Booking() {
  const { data: tracks, isLoading } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  const tracksWithOrganizers = tracks?.filter(
    (track) => track.organizerWebsite && track.organizerWebsite.trim() !== ""
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold">Book Trackdays</h1>
            <p className="text-muted-foreground">
              Browse track organizers and book your next trackday
            </p>
          </div>
        </div>

        {/* Booking Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tracksWithOrganizers && tracksWithOrganizers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tracksWithOrganizers.map((track) => (
              <Card
                key={track.id}
                className="hover-elevate"
                data-testid={`card-booking-${track.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl">{track.name}</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {track.country}
                      </div>
                    </div>
                    <div className="p-2 rounded-md bg-primary/10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {track.organizerName && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Organizer</p>
                      <p className="font-medium">{track.organizerName}</p>
                    </div>
                  )}
                  
                  <div className="text-sm font-mono text-muted-foreground">
                    {track.lat.toFixed(4)}, {track.lng.toFixed(4)}
                  </div>

                  {track.organizerWebsite && (
                    <Link href={`/booking/${track.id}`}>
                      <Button
                        variant="default"
                        className="w-full"
                        data-testid={`button-book-detail-${track.id}`}
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Book & Create Trackday
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No booking options available"
            description="Add organizer websites to tracks to enable booking functionality."
            actionLabel="Go to Tracks"
            onAction={() => (window.location.href = "/tracks")}
          />
        )}

        {/* Info Card */}
        {tracksWithOrganizers && tracksWithOrganizers.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <ExternalLink className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">How Booking Works</h3>
                  <p className="text-sm text-muted-foreground">
                    Click "Book & Create Trackday" to browse the organizer's website within the app. 
                    As you find a trackday you want to book, you can quickly transfer the booking details 
                    (date, price, notes) into your trackday planner with the quick-create form.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

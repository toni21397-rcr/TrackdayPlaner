import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Building2, Calendar, ArrowRight, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { Organizer } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Booking() {
  const { data: organizers, isLoading } = useQuery<Organizer[]>({
    queryKey: ["/api/organizers"],
  });

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
        ) : organizers && organizers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizers.map((organizer) => (
              <Card
                key={organizer.id}
                className="hover-elevate"
                data-testid={`card-booking-${organizer.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl">{organizer.name}</CardTitle>
                      {organizer.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {organizer.description}
                        </p>
                      )}
                    </div>
                    <div className="p-2 rounded-md bg-primary/10">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(organizer.contactEmail || organizer.contactPhone) && (
                    <div className="space-y-2">
                      {organizer.contactEmail && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{organizer.contactEmail}</span>
                        </div>
                      )}
                      {organizer.contactPhone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{organizer.contactPhone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    variant="default"
                    className="w-full"
                    asChild
                    data-testid={`button-book-detail-${organizer.id}`}
                  >
                    <Link href={`/booking/${organizer.id}`}>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Browse & Book Trackdays
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No organizers available"
            description="Add trackday organizers to start browsing and booking events."
            actionLabel="Go to Organizers"
            onAction={() => (window.location.href = "/organizers")}
          />
        )}

        {/* Info Card */}
        {organizers && organizers.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <ExternalLink className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">How Booking Works</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse trackday organizer websites to find available events. After finding a trackday 
                    you want to book, manually create it in your planner by going to the Trackdays page 
                    and entering the event details (date, track, price, etc).
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

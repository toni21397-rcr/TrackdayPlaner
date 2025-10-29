import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, ExternalLink, AlertTriangle, Calendar, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Organizer } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookingDetail() {
  const [, params] = useRoute("/booking/:organizerId");
  const organizerId = params?.organizerId;

  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const { data: organizer, isLoading: organizerLoading } = useQuery<Organizer>({
    queryKey: ["/api/organizers", organizerId],
    queryFn: async () => {
      const response = await fetch(`/api/organizers/${organizerId}`);
      if (!response.ok) throw new Error("Organizer not found");
      return response.json();
    },
    enabled: !!organizerId,
  });

  // Detect iframe loading failures
  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  const handleIframeError = () => {
    setIframeBlocked(true);
    setIframeLoading(false);
  };

  if (organizerLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!organizer) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <p className="text-muted-foreground">Organizer not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/booking">
              <Button variant="ghost" size="sm" data-testid="button-back-to-booking">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">{organizer.name}</h1>
              {organizer.description && (
                <p className="text-sm text-muted-foreground">{organizer.description}</p>
              )}
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href={organizer.website} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Main: Iframe */}
        <div className="flex-1 overflow-auto">
          <div className="h-full p-4">
            {iframeBlocked ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center space-y-4 p-8">
                  <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Website Blocked Embedding</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This website doesn't allow embedding. Open it in a new tab instead.
                    </p>
                    <Button asChild>
                      <a href={organizer.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="relative h-full">
                {iframeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-md">
                    <p className="text-muted-foreground">Loading organizer website...</p>
                  </div>
                )}
                <iframe
                  src={organizer.website}
                  className="w-full h-full border rounded-md"
                  title="Organizer Website"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  data-testid="iframe-organizer-website"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Contact Info */}
        <div className="w-full lg:w-96 border-l bg-muted/30 overflow-auto">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Contact Information</h2>
              <p className="text-sm text-muted-foreground">
                Use these details to get in touch with the organizer
              </p>
            </div>

            <div className="space-y-4">
              {organizer.contactEmail && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">Email</span>
                  </div>
                  <a 
                    href={`mailto:${organizer.contactEmail}`}
                    className="text-sm text-primary hover:underline block"
                  >
                    {organizer.contactEmail}
                  </a>
                </div>
              )}

              {organizer.contactPhone && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Phone className="w-4 h-4" />
                    <span className="font-medium">Phone</span>
                  </div>
                  <a 
                    href={`tel:${organizer.contactPhone}`}
                    className="text-sm text-primary hover:underline block"
                  >
                    {organizer.contactPhone}
                  </a>
                </div>
              )}
            </div>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">Manual Booking</h3>
                    <p className="text-sm text-muted-foreground">
                      Browse events on the organizer's website, then create trackdays manually 
                      by going to the <Link href="/trackdays" className="text-primary hover:underline">Trackdays page</Link>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, ExternalLink, AlertTriangle, Plus, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import type { Organizer, Track, Vehicle, InsertTrackday } from "@shared/schema";
import { insertTrackdaySchema } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export default function BookingDetail() {
  const [, params] = useRoute("/booking/:organizerId");
  const organizerId = params?.organizerId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [entryFeeDisplay, setEntryFeeDisplay] = useState("");
  const [trackSearchOpen, setTrackSearchOpen] = useState(false);
  const [trackSearch, setTrackSearch] = useState("");

  const { data: organizer, isLoading: organizerLoading } = useQuery<Organizer>({
    queryKey: ["/api/organizers", organizerId],
    queryFn: async () => {
      const response = await fetch(`/api/organizers/${organizerId}`);
      if (!response.ok) throw new Error("Organizer not found");
      return response.json();
    },
    enabled: !!organizerId,
  });

  // Fetch all tracks
  const { data: tracks } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  // Filter tracks based on search
  const filteredTracks = tracks?.filter((track) => {
    if (!trackSearch) return true;
    const searchLower = trackSearch.toLowerCase();
    const nameMatch = track.name.toLowerCase().includes(searchLower);
    const countryMatch = track.country.toLowerCase().includes(searchLower);
    return nameMatch || countryMatch;
  }) || [];

  // Fetch vehicles
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  // Form schema with entry fee
  const formSchema = insertTrackdaySchema.extend({
    entryFeeCents: z.number().min(0).optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trackId: "",
      date: "",
      durationDays: 1,
      vehicleId: null,
      participationStatus: "planned",
      notes: "",
      entryFeeCents: undefined,
    },
  });

  // Create trackday mutation
  const createTrackdayMutation = useMutation({
    mutationFn: async (data: InsertTrackday & { entryFeeCents?: number }) => {
      const { entryFeeCents, ...trackdayData } = data;
      const createdRes = await apiRequest("POST", "/api/trackdays", trackdayData);
      const trackday = await createdRes.json();

      // If entry fee provided, create cost item
      if (entryFeeCents && entryFeeCents > 0 && trackday?.id) {
        await apiRequest("POST", "/api/cost-items", {
          trackdayId: trackday.id,
          type: "entry",
          amountCents: entryFeeCents,
          currency: "CHF",
          status: "planned",
          notes: "Entry fee",
        });
      }

      return trackday;
    },
    onSuccess: (trackday) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trackdays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-items"] });
      toast({
        title: "Success",
        description: "Trackday created successfully!",
      });
      form.reset();
      setEntryFeeDisplay("");
      // Navigate to the trackday detail page
      setLocation(`/trackdays/${trackday.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create trackday",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createTrackdayMutation.mutate(data);
  };

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

      {/* Split View */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Iframe */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            {iframeBlocked ? (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center space-y-4">
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
                </div>
              </div>
            ) : (
              <div className="relative h-full">
                {iframeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <p className="text-muted-foreground">Loading organizer website...</p>
                  </div>
                )}
                <iframe
                  src={organizer.website}
                  className="w-full h-full"
                  title="Organizer Website"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  data-testid="iframe-organizer-website"
                />
              </div>
            )}
          </div>
          
          {/* Fallback Section - Always Visible */}
          {!iframeBlocked && (
            <div className="shrink-0 border-t bg-muted/50 p-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <p className="text-sm text-muted-foreground">
                    Website not loading or blocked by your browser?
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild data-testid="button-fallback-open-tab">
                  <a href={organizer.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Website Directly
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Create Trackday Form */}
        <div className="w-full md:w-96 border-l bg-muted/30 overflow-auto">
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Quick Create Trackday
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Track Selection */}
                    <FormField
                      control={form.control}
                      name="trackId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Track</FormLabel>
                          <Popover open={trackSearchOpen} onOpenChange={setTrackSearchOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={trackSearchOpen}
                                  className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="select-track"
                                >
                                  {field.value
                                    ? tracks?.find((track) => track.id === field.value)?.name
                                    : "Search for a track..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput 
                                  placeholder="Search tracks..." 
                                  data-testid="input-track-search"
                                  value={trackSearch}
                                  onValueChange={setTrackSearch}
                                />
                                <CommandList>
                                  <CommandEmpty>No track found.</CommandEmpty>
                                  <CommandGroup>
                                    {filteredTracks.map((track) => (
                                      <CommandItem
                                        key={track.id}
                                        value={track.id}
                                        onSelect={() => {
                                          form.setValue("trackId", track.id);
                                          setTrackSearchOpen(false);
                                          setTrackSearch("");
                                        }}
                                        data-testid={`track-option-${track.id}`}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === track.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span className="font-medium">{track.name}</span>
                                          <span className="text-sm text-muted-foreground">{track.country}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date */}
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Duration */}
                    <FormField
                      control={form.control}
                      name="durationDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Vehicle */}
                    <FormField
                      control={form.control}
                      name="vehicleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle (optional)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-vehicle">
                                <SelectValue placeholder="Select a vehicle" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {vehicles?.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                  {vehicle.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Status */}
                    <FormField
                      control={form.control}
                      name="participationStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-participation-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planned">Planned</SelectItem>
                              <SelectItem value="registered">Registered</SelectItem>
                              <SelectItem value="attended">Attended</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Entry Fee */}
                    <FormField
                      control={form.control}
                      name="entryFeeCents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entry Fee (CHF)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              value={entryFeeDisplay}
                              onChange={(e) => {
                                setEntryFeeDisplay(e.target.value);
                              }}
                              onBlur={() => {
                                const value = entryFeeDisplay ? Math.round(parseFloat(entryFeeDisplay) * 100) : undefined;
                                field.onChange(value);
                              }}
                              data-testid="input-entry-fee"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Add any notes..."
                              rows={3}
                              data-testid="input-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createTrackdayMutation.isPending}
                      data-testid="button-create-trackday"
                    >
                      {createTrackdayMutation.isPending ? "Creating..." : "Create Trackday"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

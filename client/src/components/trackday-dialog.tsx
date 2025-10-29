import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { insertTrackdaySchema, type InsertTrackday, type Track, type Vehicle } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TrackdayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackday?: any;
}

export function TrackdayDialog({ open, onOpenChange, trackday }: TrackdayDialogProps) {
  const { toast } = useToast();
  const [trackSearchOpen, setTrackSearchOpen] = useState(false);
  const [trackSearch, setTrackSearch] = useState("");
  const [entryFeeDisplay, setEntryFeeDisplay] = useState<string>("");

  const { data: tracks } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  // Extended form with entry fee field
  const formSchema = insertTrackdaySchema.extend({
    entryFeeCents: z.number().min(0).optional(),
  });

  type ExtendedTrackday = z.infer<typeof formSchema>;

  // Reset entry fee display when dialog closes
  useEffect(() => {
    if (!open) {
      setEntryFeeDisplay("");
      setTrackSearch("");
    }
  }, [open]);

  const form = useForm<ExtendedTrackday>({
    resolver: zodResolver(formSchema),
    defaultValues: trackday ? {
      trackId: trackday.trackId,
      date: trackday.date,
      durationDays: trackday.durationDays,
      vehicleId: trackday.vehicleId,
      notes: trackday.notes,
      participationStatus: trackday.participationStatus,
      entryFeeCents: undefined,
    } : {
      trackId: "",
      date: new Date().toISOString().split("T")[0],
      durationDays: 1,
      vehicleId: null,
      notes: "",
      participationStatus: "planned",
      entryFeeCents: undefined,
    },
  });

  // Filter tracks based on search
  const filteredTracks = tracks?.filter((track) => {
    if (!trackSearch) return true;
    const searchLower = trackSearch.toLowerCase();
    const nameMatch = track.name.toLowerCase().includes(searchLower);
    const countryMatch = track.country.toLowerCase().includes(searchLower);
    return nameMatch || countryMatch;
  }) || [];

  const mutation = useMutation({
    mutationFn: async (data: ExtendedTrackday) => {
      const { entryFeeCents, ...trackdayData } = data;
      
      if (trackday) {
        const patchRes = await apiRequest("PATCH", `/api/trackdays/${trackday.id}`, trackdayData);
        return await patchRes.json();
      }
      
      const createdRes = await apiRequest("POST", "/api/trackdays", trackdayData);
      const created = await createdRes.json();
      
      // Create entry fee cost item if provided
      if (entryFeeCents && entryFeeCents > 0 && created?.id) {
        await apiRequest("POST", "/api/cost-items", {
          trackdayId: created.id,
          type: "entry",
          amountCents: entryFeeCents,
          currency: "CHF",
          status: "planned",
          notes: "Track day entry fee",
          isTravelAuto: false,
        });
      }
      
      return created;
    },
    onSuccess: async (savedTrackday: any) => {
      const trackdayId = savedTrackday?.id || trackday?.id;
      
      queryClient.invalidateQueries({ queryKey: ["/api/trackdays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trackdays/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-items", trackdayId] });
      
      
      // Check if track or vehicle changed (for updates)
      const trackChanged = trackday && trackday.trackId !== savedTrackday?.trackId;
      const vehicleChanged = trackday && trackday.vehicleId !== savedTrackday?.vehicleId;
      const shouldRecalculate = !trackday || trackChanged || vehicleChanged;
      
      if (shouldRecalculate && trackdayId) {
        toast({
          title: trackday ? "Trackday updated" : "Trackday created",
          description: "Calculating route and fetching weather...",
        });
        
        try {
          // Calculate route automatically
          await apiRequest("POST", `/api/trackdays/${trackdayId}/calculate-route`, {});
          
          // Fetch weather automatically
          await apiRequest("POST", `/api/weather/${trackdayId}/refresh`, {});
          
          queryClient.invalidateQueries({ queryKey: ["/api/trackdays"] });
          
          toast({
            title: "Trackday ready!",
            description: "Route and weather data have been loaded.",
          });
        } catch (error) {
          console.error("Auto-calculation error:", error);
          toast({
            title: "Warning",
            description: "Trackday saved, but automatic calculation failed. You can manually recalculate from the Route tab.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Trackday updated",
          description: "Your changes have been saved.",
        });
      }
      
      onOpenChange(false);
      form.reset();
      setEntryFeeDisplay("");
      setTrackSearch("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save trackday. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{trackday ? "Edit Trackday" : "Add Trackday"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
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
                    <PopoverContent className="w-[400px] p-0" align="start">
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle (optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
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
            </div>

            {!trackday && (
              <FormField
                control={form.control}
                name="entryFeeCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Fee (optional)</FormLabel>
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
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any notes about this trackday..."
                      className="resize-none"
                      rows={3}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-save-trackday"
              >
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

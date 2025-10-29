import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertTrackSchema, type InsertTrack, type Organizer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track?: any;
}

export function TrackDialog({ open, onOpenChange, track }: TrackDialogProps) {
  const { toast } = useToast();

  const { data: organizers } = useQuery<Organizer[]>({
    queryKey: ["/api/organizers"],
  });

  const form = useForm<InsertTrack>({
    resolver: zodResolver(insertTrackSchema),
    defaultValues: {
      name: "",
      country: "",
      lat: 0,
      lng: 0,
      organizerId: null,
      organizerName: "",
      organizerWebsite: "",
    },
  });

  // Reset form when track changes or dialog opens
  useEffect(() => {
    if (open) {
      if (track) {
        form.reset({
          name: track.name,
          country: track.country,
          lat: track.lat,
          lng: track.lng,
          organizerId: track.organizerId || null,
          organizerName: track.organizerName || "",
          organizerWebsite: track.organizerWebsite || "",
        });
      } else {
        form.reset({
          name: "",
          country: "",
          lat: 0,
          lng: 0,
          organizerId: null,
          organizerName: "",
          organizerWebsite: "",
        });
      }
    }
  }, [open, track, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertTrack) => {
      if (track) {
        return apiRequest("PATCH", `/api/tracks/${track.id}`, data);
      }
      return apiRequest("POST", "/api/tracks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      toast({
        title: track ? "Track updated" : "Track created",
        description: "Your track has been saved successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save track. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{track ? "Edit Track" : "Add Track"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Track Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Spa-Francorchamps" data-testid="input-track-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Belgium" data-testid="input-country" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-lat"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-lng"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="organizerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Organizer (Optional)</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => {
                      field.onChange(value || null);
                      const selectedOrganizer = organizers?.find(o => o.id === value);
                      if (selectedOrganizer) {
                        form.setValue("organizerName", selectedOrganizer.name);
                        form.setValue("organizerWebsite", selectedOrganizer.website);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-organizer">
                        <SelectValue placeholder="Choose an existing organizer or enter manually below" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizers?.map((organizer) => (
                        <SelectItem key={organizer.id} value={organizer.id}>
                          {organizer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a saved organizer or manually enter details below
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organizer Name (Manual)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Circuit de Spa-Francorchamps" data-testid="input-organizer-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizerWebsite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organizer Website (Manual)</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" placeholder="https://www.spa-francorchamps.be" data-testid="input-organizer-website" />
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
                data-testid="button-save-track"
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

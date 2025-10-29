import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { insertLapSchema, type InsertLap } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

export function LapDialog({ open, onOpenChange, sessionId }: LapDialogProps) {
  const { toast } = useToast();

  const form = useForm<InsertLap>({
    resolver: zodResolver(insertLapSchema),
    defaultValues: {
      sessionId,
      lapNumber: 1,
      lapTimeMs: 0,
      sectorTimesMsJson: null,
      valid: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertLap) => {
      return apiRequest("POST", "/api/laps", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Lap added",
        description: "Your lap time has been saved successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save lap. Please try again.",
        variant: "destructive",
      });
    },
  });

  const parseLapTime = (timeStr: string): number => {
    if (!timeStr || timeStr.trim() === "") return 0;
    
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      if (isNaN(minutes) || isNaN(seconds)) return 0;
      return (minutes * 60 + seconds) * 1000;
    }
    
    const parsed = parseFloat(timeStr);
    if (isNaN(parsed)) return 0;
    return parsed * 1000;
  };

  const formatLapTimeForInput = (ms: number): string => {
    if (ms === 0 || isNaN(ms)) return "";
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby="lap-dialog-description">
        <DialogHeader>
          <DialogTitle>Add Lap Time</DialogTitle>
        </DialogHeader>
        <p id="lap-dialog-description" className="sr-only">
          Add a new lap time to this session
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lapNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lap Number</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-lap-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lapTimeMs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lap Time (M:SS.SSS)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1:23.456"
                        value={formatLapTimeForInput(field.value)}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Allow partial input while typing
                          if (inputValue === "" || inputValue.match(/^[\d:.]*$/)) {
                            const ms = parseLapTime(inputValue);
                            field.onChange(ms);
                          }
                        }}
                        onBlur={(e) => {
                          // Validate on blur to ensure we have a complete time
                          const ms = parseLapTime(e.target.value);
                          field.onChange(ms);
                        }}
                        data-testid="input-lap-time"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter time as minutes:seconds.milliseconds (e.g., 1:23.456)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="valid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-valid"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Valid lap
                    </FormLabel>
                    <FormDescription>
                      Uncheck if this lap had issues or penalties
                    </FormDescription>
                  </div>
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
                data-testid="button-save-lap"
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

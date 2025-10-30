import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { insertVehicleSchema, type InsertVehicle } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: any;
}

// Schema for client-side form (userId is injected by the backend)
const vehicleFormSchema = insertVehicleSchema.omit({ userId: true });
type VehicleFormData = Omit<InsertVehicle, 'userId'>;

export function VehicleDialog({ open, onOpenChange, vehicle }: VehicleDialogProps) {
  const { toast } = useToast();
  const [modelSearchOpen, setModelSearchOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");

  // Fetch motorcycle models from the database
  const { data: motorcycleModelsData = [] } = useQuery<any[]>({
    queryKey: ["/api/motorcycle-models"],
  });

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: vehicle || {
      name: "",
      type: "motorcycle",
      fuelType: "gasoline",
      consumptionPer100: 0,
      notes: "",
    },
  });

  // Reset form and search state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setModelSearch("");
      setModelSearchOpen(false);
    }
    onOpenChange(isOpen);
  };

  // Get predefined model names
  const predefinedModelNames = motorcycleModelsData
    .filter((m: any) => m.isActive)
    .map((m: any) => m.name);

  // Filter motorcycle models based on search
  const filteredModels = predefinedModelNames.filter((model: string) => {
    if (!modelSearch) return true;
    return model.toLowerCase().includes(modelSearch.toLowerCase());
  });

  const mutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      if (vehicle) {
        return apiRequest("PATCH", `/api/vehicles/${vehicle.id}`, data);
      }
      return apiRequest("POST", "/api/vehicles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: vehicle ? "Vehicle updated" : "Vehicle created",
        description: "Your vehicle has been saved successfully.",
      });
      handleOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save vehicle. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Determine what to show in the button
  const selectedValue = form.watch("name");
  const isCustom = selectedValue && !predefinedModelNames.includes(selectedValue);
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Vehicle Name</FormLabel>
                  <Popover open={modelSearchOpen} onOpenChange={setModelSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={modelSearchOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="select-vehicle-model"
                        >
                          {field.value || "Search for a motorcycle model..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search motorcycle models or type custom name..."
                          data-testid="input-model-search"
                          value={modelSearch}
                          onValueChange={setModelSearch}
                        />
                        <CommandList>
                          {modelSearch && !filteredModels.some(m => m.toLowerCase() === modelSearch.toLowerCase()) && (
                            <CommandGroup heading="Custom">
                              <CommandItem
                                value={modelSearch}
                                onSelect={() => {
                                  form.setValue("name", modelSearch);
                                  setModelSearchOpen(false);
                                  setModelSearch("");
                                }}
                                data-testid="option-custom-model"
                              >
                                <Check className="mr-2 h-4 w-4 opacity-0" />
                                <div className="flex flex-col">
                                  <span className="font-medium">Use custom: "{modelSearch}"</span>
                                  <span className="text-xs text-muted-foreground">Create a custom vehicle name</span>
                                </div>
                              </CommandItem>
                            </CommandGroup>
                          )}
                          {filteredModels.length > 0 && (
                            <CommandGroup heading="Predefined Models">
                              {filteredModels.map((model) => (
                                <CommandItem
                                  key={model}
                                  value={model}
                                  onSelect={() => {
                                    form.setValue("name", model);
                                    setModelSearchOpen(false);
                                    setModelSearch("");
                                  }}
                                  data-testid={`option-model-${model.replace(/\s+/g, '-').toLowerCase()}`}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === model ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {model}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {filteredModels.length === 0 && !modelSearch && (
                            <CommandEmpty>Start typing to search or enter a custom name</CommandEmpty>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-vehicle-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any notes about this vehicle..."
                      className="resize-none"
                      rows={3}
                      data-testid="input-vehicle-notes"
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
                onClick={() => handleOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-save-vehicle"
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

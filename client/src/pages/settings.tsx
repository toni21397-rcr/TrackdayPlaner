import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { insertSettingsSchema, type InsertSettings, type Settings, insertNotificationPreferencesSchema, type InsertNotificationPreferences, type NotificationPreferences } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Navigation } from "lucide-react";

// Common timezones for the selector
const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/Zurich", label: "Europe/Zurich (CET)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [addressInput, setAddressInput] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: notificationPrefs, isLoading: notificationPrefsLoading } = useQuery<NotificationPreferences>({
    queryKey: ["/api/notification-preferences"],
  });

  const form = useForm<InsertSettings>({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: settings || {
      currency: "CHF",
      homeLat: 47.3769,
      homeLng: 8.5417,
      fuelPricePerLitre: 1.90,
      tollsPerKm: 0.05,
      annualBudgetCents: 500000,
      openRouteServiceKey: "",
      openWeatherApiKey: "",
    },
  });

  const notificationForm = useForm<InsertNotificationPreferences>({
    resolver: zodResolver(insertNotificationPreferencesSchema),
    defaultValues: {
      userId: "",
      emailEnabled: true,
      inAppEnabled: true,
      timezone: "UTC",
      quietHours: {},
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertSettings) => {
      return apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary"] });
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const notificationMutation = useMutation({
    mutationFn: async (data: InsertNotificationPreferences) => {
      const userId = user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }
      return apiRequest("POST", "/api/notification-preferences", { ...data, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({
        title: "Notification preferences saved",
        description: "Your notification preferences have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings && !form.formState.isDirty) {
      form.reset(settings);
    }
  }, [settings, form]);

  // Update notification form when preferences load
  useEffect(() => {
    if (notificationPrefs && !notificationForm.formState.isDirty) {
      notificationForm.reset(notificationPrefs);
    }
  }, [notificationPrefs, notificationForm]);

  const geocodeAddress = async (address: string) => {
    if (!address.trim()) {
      toast({
        title: "Error",
        description: "Please enter an address to search",
        variant: "destructive",
      });
      return;
    }

    setIsGeocoding(true);
    try {
      const googleKey = form.getValues("googleMapsApiKey");
      const orsKey = form.getValues("openRouteServiceKey");

      let lat: number | null = null;
      let lng: number | null = null;
      let provider = "";

      if (googleKey) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`
          );
          const data = await response.json();

          if (data.status === "OK" && data.results.length > 0) {
            lat = data.results[0].geometry.location.lat;
            lng = data.results[0].geometry.location.lng;
            provider = "Google Maps";
          } else if (orsKey) {
            const orsResponse = await fetch(
              `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=${encodeURIComponent(address)}&size=1`
            );
            const orsData = await orsResponse.json();

            if (orsData.features && orsData.features.length > 0) {
              lng = orsData.features[0].geometry.coordinates[0];
              lat = orsData.features[0].geometry.coordinates[1];
              provider = "OpenRouteService";
            }
          }
        } catch {
          if (orsKey) {
            const orsResponse = await fetch(
              `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=${encodeURIComponent(address)}&size=1`
            );
            const orsData = await orsResponse.json();

            if (orsData.features && orsData.features.length > 0) {
              lng = orsData.features[0].geometry.coordinates[0];
              lat = orsData.features[0].geometry.coordinates[1];
              provider = "OpenRouteService";
            }
          }
        }
      } else if (orsKey) {
        const response = await fetch(
          `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=${encodeURIComponent(address)}&size=1`
        );
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          lng = data.features[0].geometry.coordinates[0];
          lat = data.features[0].geometry.coordinates[1];
          provider = "OpenRouteService";
        }
      } else {
        toast({
          title: "API Key Required",
          description: "Please configure Google Maps or OpenRouteService API key first",
          variant: "destructive",
        });
        return;
      }

      if (lat !== null && lng !== null) {
        form.setValue("homeLat", lat);
        form.setValue("homeLng", lng);
        toast({
          title: "Location found",
          description: `Coordinates set to ${lat.toFixed(4)}, ${lng.toFixed(4)} via ${provider}`,
        });
        setAddressInput("");
      } else {
        throw new Error("Address not found");
      }
    } catch (error) {
      toast({
        title: "Geocoding failed",
        description: error instanceof Error ? error.message : "Could not find address. Try a different search term.",
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        form.setValue("homeLat", lat);
        form.setValue("homeLng", lng);
        toast({
          title: "Location updated",
          description: `Current location set to ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        toast({
          title: "Location access denied",
          description: error.message || "Could not get your location",
          variant: "destructive",
        });
        setIsGettingLocation(false);
      }
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your preferences and API keys
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="CHF" data-testid="input-currency" />
                        </FormControl>
                        <FormDescription>
                          Currency code for displaying costs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="annualBudgetCents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Budget</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))}
                            value={field.value ? field.value / 100 : 0}
                            data-testid="input-budget"
                          />
                        </FormControl>
                        <FormDescription>
                          Your yearly budget for trackdays in {form.watch("currency")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Home Location</CardTitle>
                  <CardDescription>
                    Set your starting point for route calculations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter address (e.g., Zurich, Switzerland)"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            geocodeAddress(addressInput);
                          }
                        }}
                        data-testid="input-address-search"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => geocodeAddress(addressInput)}
                        disabled={isGeocoding}
                        data-testid="button-search-address"
                      >
                        <MapPin className="h-4 w-4" />
                        {isGeocoding ? "Searching..." : "Search"}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={useCurrentLocation}
                      disabled={isGettingLocation}
                      className="w-full"
                      data-testid="button-use-current-location"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      {isGettingLocation ? "Getting location..." : "Use Current Location"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="homeLat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.0001"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-home-lat"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="homeLng"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.0001"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-home-lng"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormDescription>
                    Coordinates are auto-filled from address or location, but can be edited manually
                  </FormDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fuel & Travel Costs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fuelPricePerLitre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel Price per Litre</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-fuel-price"
                          />
                        </FormControl>
                        <FormDescription>
                          Current fuel price in {form.watch("currency")}/L
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tollsPerKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tolls per Kilometer</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-tolls"
                          />
                        </FormControl>
                        <FormDescription>
                          Average toll cost per km in {form.watch("currency")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="openRouteServiceKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OpenRouteService API Key</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Leave empty to use mock data"
                            data-testid="input-ors-key"
                          />
                        </FormControl>
                        <FormDescription>
                          Optional: API key for route calculations
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="openWeatherApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OpenWeather API Key</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Leave empty to use mock data"
                            data-testid="input-weather-key"
                          />
                        </FormControl>
                        <FormDescription>
                          Optional: API key for weather forecasts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="googleMapsApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Maps API Key</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Leave empty to use OpenRouteService"
                            data-testid="input-google-maps-key"
                          />
                        </FormControl>
                        <FormDescription>
                          Optional: API key for Google Maps route calculations (matches navigation exactly)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  data-testid="button-save-settings"
                >
                  {mutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {notificationPrefsLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Notifications</CardTitle>
              <CardDescription>
                Configure how you receive maintenance reminders and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit((data) => notificationMutation.mutate(data))} className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="emailEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Email Notifications</FormLabel>
                          <FormDescription>
                            Receive email reminders when maintenance tasks are due
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-email-notifications"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="inAppEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">In-App Nudges</FormLabel>
                          <FormDescription>
                            Show due tasks when logging maintenance in the app
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-in-app-notifications"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-timezone">
                              <SelectValue placeholder="Select a timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIMEZONES.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Notifications will be sent based on this timezone
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={notificationMutation.isPending}
                      data-testid="button-save-notification-preferences"
                    >
                      {notificationMutation.isPending ? "Saving..." : "Save Notification Preferences"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

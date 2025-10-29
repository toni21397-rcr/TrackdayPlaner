import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, Wind, Droplets, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WeatherCache } from "@shared/schema";

interface WeatherTabProps {
  trackdayId: string;
  date: string;
}

export function WeatherTab({ trackdayId, date }: WeatherTabProps) {
  const { toast } = useToast();

  const { data: weather } = useQuery<WeatherCache>({
    queryKey: ["/api/weather", trackdayId],
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/weather/${trackdayId}/refresh`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weather"] });
      toast({
        title: "Weather refreshed",
        description: "Weather forecast has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to refresh weather.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Weather Forecast</CardTitle>
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            size="sm"
            variant="outline"
            data-testid="button-refresh-weather"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {weather ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Cloud className="w-5 h-5" />
                  <p className="text-sm font-medium">Temperature</p>
                </div>
                <p className="text-3xl font-mono font-semibold" data-testid="weather-temp">
                  {weather.temperature}°C
                </p>
                <p className="text-sm text-muted-foreground capitalize">{weather.description}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Droplets className="w-5 h-5" />
                  <p className="text-sm font-medium">Rain Chance</p>
                </div>
                <p className="text-3xl font-mono font-semibold">
                  {weather.rainChance}%
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wind className="w-5 h-5" />
                  <p className="text-sm font-medium">Wind Speed</p>
                </div>
                <p className="text-3xl font-mono font-semibold">
                  {weather.windSpeed} km/h
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Click "Refresh" to load weather forecast
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

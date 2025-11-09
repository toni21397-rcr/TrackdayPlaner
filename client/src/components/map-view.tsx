import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Track, Trackday } from "@shared/schema";

// Fix default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface TrackdayWithTrack extends Trackday {
  track?: Track;
}

interface MapViewProps {
  tracks: Track[];
  trackdays?: TrackdayWithTrack[];
  onTrackClick?: (track: Track) => void;
  onTrackdayClick?: (trackday: TrackdayWithTrack) => void;
  onTrackSelect?: (track: Track) => void;
  selectedTrackId?: string | null;
  center?: [number, number];
  zoom?: number;
  autoFitBounds?: boolean;
  className?: string;
}

export function MapView({
  tracks,
  trackdays = [],
  onTrackClick,
  onTrackdayClick,
  onTrackSelect,
  selectedTrackId = null,
  center = [46.8182, 8.2275], // Switzerland default
  zoom = 6,
  autoFitBounds = true,
  className = "",
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Add Google Maps-style tile layer (CartoDB Voyager - clean, modern look similar to Google Maps)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when tracks or trackdays change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers and polylines
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    polylinesRef.current.forEach((polyline) => polyline.remove());
    polylinesRef.current = [];

    // Create status color map
    const statusColors: Record<string, string> = {
      planned: "#3b82f6", // blue
      registered: "#f59e0b", // amber
      attended: "#10b981", // green
      cancelled: "#ef4444", // red
    };

    // Add track markers
    tracks.forEach((track) => {
      // Find trackdays for this track
      const trackTrackdays = trackdays.filter((td) => td.trackId === track.id);
      const hasTrackdays = trackTrackdays.length > 0;

      // Create custom icon based on trackday status
      let iconHtml = '<div style="';
      if (hasTrackdays) {
        const latestTrackday = trackTrackdays[trackTrackdays.length - 1];
        const color = statusColors[latestTrackday.participationStatus] || "#6b7280";
        iconHtml += `background-color: ${color}; `;
      } else {
        iconHtml += "background-color: #6b7280; "; // gray for no trackdays
      }
      iconHtml +=
        'width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>';

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([track.lat, track.lng], { icon: customIcon }).addTo(mapRef.current!);

      // Create popup content
      let popupContent = `<div class="p-2">
        <div class="font-semibold text-base">${track.name}</div>
        <div class="text-sm text-gray-600">${track.country}</div>`;

      if (hasTrackdays) {
        popupContent += `<div class="mt-2 text-sm">
          <div class="font-medium">${trackTrackdays.length} trackday${trackTrackdays.length !== 1 ? "s" : ""}</div>`;

        // Show status breakdown
        const statusCounts: Record<string, number> = {};
        trackTrackdays.forEach((td) => {
          statusCounts[td.participationStatus] = (statusCounts[td.participationStatus] || 0) + 1;
        });

        Object.entries(statusCounts).forEach(([status, count]) => {
          const color = statusColors[status] || "#6b7280";
          popupContent += `<div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color};"></div>
            <span>${count} ${status}</span>
          </div>`;
        });

        popupContent += `</div>`;
      }

      popupContent += `</div>`;

      marker.bindPopup(popupContent);

      // Click handler - prioritize track selection for info panel
      marker.on("click", () => {
        if (onTrackSelect) {
          onTrackSelect(track);
        } else if (hasTrackdays && onTrackdayClick) {
          onTrackdayClick(trackTrackdays[trackTrackdays.length - 1]);
        } else if (onTrackClick) {
          onTrackClick(track);
        }
      });

      markersRef.current.push(marker);
    });

    // Add route polylines for trackdays with geometry
    trackdays.forEach((trackday) => {
      if (!trackday.routeGeometry || !trackday.track) return;

      try {
        const coordinates = JSON.parse(trackday.routeGeometry) as [number, number][];
        // Convert [lng, lat] to [lat, lng] for Leaflet
        const latLngs: [number, number][] = coordinates.map(([lng, lat]) => [lat, lng]);

        const color = statusColors[trackday.participationStatus] || "#6b7280";
        const polyline = L.polyline(latLngs, {
          color: color,
          weight: 3,
          opacity: 0.6,
        }).addTo(mapRef.current!);

        // Add popup to polyline
        polyline.bindPopup(`
          <div class="p-2">
            <div class="font-semibold">Route to ${trackday.track.name}</div>
            <div class="text-sm text-gray-600">${trackday.routeDistance?.toFixed(0)} km</div>
            <div class="text-sm text-gray-600">${trackday.routeDuration} min</div>
          </div>
        `);

        polylinesRef.current.push(polyline);
      } catch (error) {
        console.error("Failed to parse route geometry:", error);
      }
    });

    // Fit bounds if we have markers or polylines and autoFitBounds is enabled
    if (autoFitBounds) {
      const allLayers = [...markersRef.current, ...polylinesRef.current];
      if (allLayers.length > 0) {
        const group = L.featureGroup(allLayers);
        mapRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    }
  }, [tracks, trackdays, onTrackClick, onTrackdayClick, autoFitBounds]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: "100%", width: "100%", minHeight: "400px" }}
      data-testid="map-container"
    />
  );
}

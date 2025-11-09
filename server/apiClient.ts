import { z } from 'zod';

export type ApiErrorType = 'timeout' | 'badResponse' | 'rateLimited' | 'networkError' | 'unknown';

export interface ApiError extends Error {
  type: ApiErrorType;
  statusCode?: number;
  retryable: boolean;
}

export interface ServiceConfig {
  name: string;
  timeout: number;
  maxRetries: number;
  retryDelays: number[];
}

export interface CircuitBreakerState {
  consecutiveFailures: number;
  lastFailureTime: number | null;
  isOpen: boolean;
}

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_COOLDOWN = 60000;

const circuitBreakers = new Map<string, CircuitBreakerState>();

const serviceConfigs: Record<string, ServiceConfig> = {
  googleMaps: {
    name: 'Google Maps',
    timeout: 5000,
    maxRetries: 3,
    retryDelays: [200, 400, 800],
  },
  openRouteService: {
    name: 'OpenRouteService',
    timeout: 5000,
    maxRetries: 3,
    retryDelays: [200, 400, 800],
  },
  openWeather: {
    name: 'OpenWeather',
    timeout: 3000,
    maxRetries: 3,
    retryDelays: [200, 400, 800],
  },
  geocoding: {
    name: 'Geocoding',
    timeout: 4000,
    maxRetries: 3,
    retryDelays: [200, 400, 800],
  },
};

function getCircuitBreaker(serviceName: string): CircuitBreakerState {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, {
      consecutiveFailures: 0,
      lastFailureTime: null,
      isOpen: false,
    });
  }
  return circuitBreakers.get(serviceName)!;
}

function recordSuccess(serviceName: string): void {
  const breaker = getCircuitBreaker(serviceName);
  breaker.consecutiveFailures = 0;
  breaker.isOpen = false;
  breaker.lastFailureTime = null;
}

function recordFailure(serviceName: string): void {
  const breaker = getCircuitBreaker(serviceName);
  breaker.consecutiveFailures += 1;
  breaker.lastFailureTime = Date.now();
  
  if (breaker.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    breaker.isOpen = true;
    console.warn(`[ApiClient] Circuit breaker opened for ${serviceName} after ${breaker.consecutiveFailures} consecutive failures`);
  }
}

function isCircuitBreakerOpen(serviceName: string): boolean {
  const breaker = getCircuitBreaker(serviceName);
  
  if (!breaker.isOpen) {
    return false;
  }
  
  if (breaker.lastFailureTime && (Date.now() - breaker.lastFailureTime) > CIRCUIT_BREAKER_COOLDOWN) {
    console.log(`[ApiClient] Circuit breaker cooldown expired for ${serviceName}, attempting reset`);
    breaker.isOpen = false;
    breaker.consecutiveFailures = 0;
    return false;
  }
  
  return true;
}

export function isServiceAvailable(serviceName: 'googleMaps' | 'openRouteService' | 'openWeather' | 'geocoding'): boolean {
  return !isCircuitBreakerOpen(serviceConfigs[serviceName].name);
}

function addJitter(delay: number): number {
  const jitter = Math.random() * 0.3 * delay;
  return delay + jitter;
}

function createApiError(message: string, type: ApiErrorType, statusCode?: number, retryable: boolean = false): ApiError {
  const error = new Error(message) as ApiError;
  error.type = type;
  error.statusCode = statusCode;
  error.retryable = retryable;
  return error;
}

export async function requestWithRetry<T>(
  config: ServiceConfig,
  url: string,
  options: RequestInit = {}
): Promise<T> {
  if (isCircuitBreakerOpen(config.name)) {
    const error = createApiError(
      `Circuit breaker is open for ${config.name}`,
      'networkError',
      undefined,
      false
    );
    console.warn(`[ApiClient] ${config.name} - circuit breaker is open, skipping request`);
    throw error;
  }

  let lastError: ApiError | null = null;
  const startTime = Date.now();
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const statusCode = response.status;
        
        if (statusCode === 429) {
          throw createApiError(
            `Rate limited by ${config.name}`,
            'rateLimited',
            statusCode,
            attempt < config.maxRetries
          );
        }
        
        if (statusCode >= 500) {
          throw createApiError(
            `${config.name} server error: ${statusCode}`,
            'badResponse',
            statusCode,
            attempt < config.maxRetries
          );
        }
        
        throw createApiError(
          `${config.name} client error: ${statusCode}`,
          'badResponse',
          statusCode,
          false
        );
      }
      
      const data = await response.json();
      recordSuccess(config.name);
      
      const duration = Date.now() - startTime;
      console.log(`[ApiClient] ${config.name} - success (${duration}ms, attempt ${attempt + 1}/${config.maxRetries + 1})`);
      
      return data as T;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = createApiError(
          `${config.name} request timed out after ${config.timeout}ms`,
          'timeout',
          undefined,
          attempt < config.maxRetries
        );
      } else if ((error as ApiError).type) {
        lastError = error as ApiError;
      } else {
        lastError = createApiError(
          `${config.name} network error: ${error instanceof Error ? error.message : String(error)}`,
          'networkError',
          undefined,
          attempt < config.maxRetries
        );
      }
      
      console.warn(`[ApiClient] ${config.name} - ${lastError.type} (attempt ${attempt + 1}/${config.maxRetries + 1}): ${lastError.message}`);
      
      if (attempt < config.maxRetries && lastError.retryable) {
        const delay = addJitter(config.retryDelays[attempt]);
        console.log(`[ApiClient] ${config.name} - retrying after ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      break;
    }
  }
  
  recordFailure(config.name);
  const duration = Date.now() - startTime;
  console.error(`[ApiClient] ${config.name} - failed after ${duration}ms and ${config.maxRetries + 1} attempts`);
  throw lastError!;
}

const GoogleDirectionsResponseSchema = z.object({
  status: z.string(),
  routes: z.array(z.object({
    legs: z.array(z.object({
      distance: z.object({ value: z.number() }),
      duration: z.object({ value: z.number() }),
    })),
    overview_polyline: z.object({
      points: z.string(),
    }),
  })).optional(),
});

export async function getGoogleDirections(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  apiKey: string
): Promise<{ distance: number; duration: number; geometry: string }> {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&key=${apiKey}`;
  
  const data = await requestWithRetry<unknown>(
    serviceConfigs.googleMaps,
    url,
    { method: 'GET' }
  );
  
  const validated = GoogleDirectionsResponseSchema.parse(data);
  
  if (validated.status !== 'OK' || !validated.routes || validated.routes.length === 0) {
    throw createApiError(
      `Google Maps API returned status: ${validated.status}`,
      'badResponse',
      undefined,
      false
    );
  }
  
  const route = validated.routes[0];
  const leg = route.legs[0];
  const distance = Math.round(leg.distance.value / 1000);
  const duration = Math.round(leg.duration.value / 60);
  
  const polyline = route.overview_polyline.points;
  const coordinates = decodePolyline(polyline);
  const geometry = JSON.stringify(coordinates);
  
  return { distance, duration, geometry };
}

const OpenRouteServiceResponseSchema = z.object({
  features: z.array(z.object({
    properties: z.object({
      segments: z.array(z.object({
        distance: z.number(),
        duration: z.number(),
      })),
    }),
    geometry: z.object({
      coordinates: z.array(z.array(z.number())),
    }),
  })),
});

export async function getORSRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  apiKey: string
): Promise<{ distance: number; duration: number; geometry: string }> {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${fromLng},${fromLat}&end=${toLng},${toLat}`;
  
  const data = await requestWithRetry<unknown>(
    serviceConfigs.openRouteService,
    url,
    {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json',
      },
    }
  );
  
  const validated = OpenRouteServiceResponseSchema.parse(data);
  
  const feature = validated.features[0];
  const segment = feature.properties.segments[0];
  const distance = Math.round(segment.distance / 1000);
  const duration = Math.round(segment.duration / 60);
  const geometry = JSON.stringify(feature.geometry.coordinates);
  
  return { distance, duration, geometry };
}

const OpenWeatherResponseSchema = z.object({
  list: z.array(z.object({
    main: z.object({
      temp: z.number(),
    }),
    pop: z.number().optional(),
    wind: z.object({
      speed: z.number(),
    }),
    weather: z.array(z.object({
      description: z.string(),
    })),
  })),
});

export async function getOpenWeatherForecast(
  lat: number,
  lng: number,
  apiKey: string
): Promise<{ temperature: number; rainChance: number; windSpeed: number; description: string }> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
  
  const data = await requestWithRetry<unknown>(
    serviceConfigs.openWeather,
    url,
    { method: 'GET' }
  );
  
  const validated = OpenWeatherResponseSchema.parse(data);
  
  const forecast = validated.list[0];
  
  return {
    temperature: Math.round(forecast.main.temp),
    rainChance: Math.round((forecast.pop || 0) * 100),
    windSpeed: Math.round(forecast.wind.speed * 3.6),
    description: forecast.weather[0].description,
  };
}

function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

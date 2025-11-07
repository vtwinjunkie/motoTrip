export interface Waypoint {
  location: string;
  description: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface WeatherPoint {
  location: string;
  forecast: string;
  temperature: string;
  lat: number;
  lng: number;
}

export interface TrafficAdvisory {
  location: string;
  advisory: string;
}

export interface FuelStop {
  name: string;
  location: string;
  type: 'Petrol' | 'EV Charger' | 'Both';
  lat: number;
  lng: number;
  url?: string;
}

export interface PointOfInterest {
  name: string;
  location: string;
  description: string;
}

export interface Advisory {
  title: string;
  details: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface TripSummary {
  totalDistance: string;
  estimatedDuration: string;
}

export interface TripPlan {
  tripTitle: string;
  summary: TripSummary;
  waypoints: Waypoint[];
  routePath: RoutePoint[];
  weatherPoints: WeatherPoint[];
  fuelStops: FuelStop[];
  pointsOfInterest: PointOfInterest[];
  trafficAdvisories: TrafficAdvisory[];
  motorcycleAdvisories: Advisory[];
}

export interface GeocodingSuggestion {
  displayName: string;
}

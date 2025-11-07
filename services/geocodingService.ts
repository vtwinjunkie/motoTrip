import { config } from '../config';
import type { GeocodingSuggestion } from '../types';
// Fix: Add a global declaration for `window.google` to inform TypeScript about the property
// added by the Google Maps script.
declare global {
  interface Window {
    google: any;
  }
}
// Declare google for TypeScript to recognize the SDK loaded from the script
declare const google: any;
let autocompleteService: any;
let scriptLoadingPromise: Promise<void> | null = null;
/**
 * Dynamically loads the Google Maps JavaScript SDK.
 * Ensures the script is only loaded once.
 * @returns A promise that resolves when the script is loaded.
 */
const loadGoogleMapsScript = (): Promise<void> => {
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }
  scriptLoadingPromise = new Promise((resolve, reject) => {
    const apiKey = config.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_MAPS_API_KEY not set in config, cannot load Google Maps script.");
      return reject(new Error("GOOGLE_MAPS_API_KEY not set in config."));
    }
    // If script is already present, resolve immediately
    if (window.google && window.google.maps) {
      return resolve();
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      console.error('Failed to load Google Maps script.');
      reject(new Error('Failed to load Google Maps script.'));
    };
    document.head.appendChild(script);
  });
  return scriptLoadingPromise;
};
/**
 * Initializes and returns a singleton instance of the Google Places AutocompleteService.
 * @returns A promise that resolves with the AutocompleteService instance.
 */
const getAutocompleteService = async (): Promise<any> => {
  if (!autocompleteService) {
    await loadGoogleMapsScript();
    if (window.google && window.google.maps && window.google.maps.places) {
      autocompleteService = new google.maps.places.AutocompleteService();
    } else {
      throw new Error("Google Maps Places library not available after loading script.");
    }
  }
  return autocompleteService;
};
/**
 * Fetches location suggestions using the Google Maps JavaScript SDK.
 * @param query The user's input string.
 * @returns A promise that resolves to an array of suggestions.
 */
export const fetchSuggestions = async (query: string): Promise<GeocodingSuggestion[]> => {
  try {
    const service = await getAutocompleteService();
    return new Promise((resolve) => {
      service.getPlacePredictions(
        { input: query },
        (predictions: any[] | null, status: any) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK && status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            console.error('Google Places API returned an error status:', status);
            return resolve([]); // Gracefully handle API errors by returning no suggestions
          }
          if (!predictions) {
            return resolve([]);
          }
          // Map the Google API response to our app's data structure.
          const suggestions = predictions.map((prediction: any) => ({
            displayName: prediction.description,
          }));
          
          resolve(suggestions);
        }
      );
    });
  } catch (error) {
    console.error("Failed to fetch geocoding suggestions:", error);
    return []; // Return empty array on error to prevent app crash
  }
};
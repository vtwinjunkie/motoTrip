import { config } from '../config';
import { GoogleGenAI, Type } from '@google/genai';
import type { TripPlan, WeatherPoint } from '../types';

const tripPlanSchema = {
  type: Type.OBJECT,
  properties: {
    tripTitle: { type: Type.STRING, description: "A catchy title for the trip." },
    summary: {
      type: Type.OBJECT,
      properties: {
        totalDistance: { type: Type.STRING, description: "e.g., '450 miles (724 km)'" },
        estimatedDuration: { type: Type.STRING, description: "e.g., '9 hours driving'" },
      },
      required: ['totalDistance', 'estimatedDuration'],
    },
    waypoints: {
      type: Type.ARRAY,
      description: "A list of 4-6 key waypoints or segments of the journey.",
      items: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING, description: "City, town, or specific point of interest." },
          description: { type: Type.STRING, description: "A brief description of this leg of the journey or what to see there." },
        },
        required: ['location', 'description'],
      },
    },
    routePath: {
        type: Type.ARRAY,
        description: "An array of 15-20 latitude/longitude points to draw the route on a map. These points should trace the main roads of the recommended route.",
        items: {
            type: Type.OBJECT,
            properties: {
                lat: { type: Type.NUMBER, description: "Latitude" },
                lng: { type: Type.NUMBER, description: "Longitude" },
            },
            required: ['lat', 'lng'],
        }
    },
    weatherPoints: {
      type: Type.ARRAY,
      description: "Weather forecasts for 5-7 key locations along the route, relevant to the travel date and time. Include coordinates for each location.",
      items: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING, description: "The city or area for the forecast." },
          forecast: { type: Type.STRING, description: "e.g., 'Sunny, 75°F'" },
          temperature: { type: Type.STRING, description: "e.g., '75°F / 24°C'" },
          lat: { type: Type.NUMBER, description: "Latitude of the weather location." },
          lng: { type: Type.NUMBER, description: "Longitude of the weather location." },
        },
        required: ['location', 'forecast', 'temperature', 'lat', 'lng'],
      },
    },
     trafficAdvisories: {
      type: Type.ARRAY,
      description: "A list of 2-4 potential traffic-heavy areas or times based on the provided travel schedule.",
      items: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING, description: "The area or highway segment prone to traffic." },
          advisory: { type: Type.STRING, description: "Details about the traffic, e.g., 'Heavy commute traffic likely between 4 PM - 6 PM'." },
        },
        required: ['location', 'advisory'],
      },
    },
    fuelStops: {
      type: Type.ARRAY,
      description: "A list of recommended petrol or EV charging stations along the route.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "e.g., 'Shell' or 'Electrify America'." },
          location: { type: Type.STRING, description: "e.g., 'near Big Sur'." },
          type: { type: Type.STRING, description: "Type of stop: 'Petrol', 'EV Charger', or 'Both'." },
          lat: { type: Type.NUMBER, description: "Latitude of the fuel stop." },
          lng: { type: Type.NUMBER, description: "Longitude of the fuel stop." },
          url: { type: Type.STRING, description: "A URL to the station's details, like a Google Maps link or official site."}
        },
        required: ['name', 'location', 'type', 'lat', 'lng'],
      },
    },
    pointsOfInterest: {
      type: Type.ARRAY,
      description: "3-5 interesting tourist spots or attractions.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          location: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['name', 'location', 'description'],
      },
    },
    motorcycleAdvisories: {
      type: Type.ARRAY,
      description: "Crucial advisories for the specified vehicle type.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          details: { type: Type.STRING },
          severity: { type: Type.STRING, description: "Severity of the advisory: 'Low', 'Medium', or 'High'." },
        },
        required: ['title', 'details', 'severity'],
      },
    },
  },
  required: ['tripTitle', 'summary', 'waypoints', 'routePath', 'weatherPoints', 'trafficAdvisories', 'fuelStops', 'pointsOfInterest', 'motorcycleAdvisories'],
};


/**
 * Fetches live weather data for a given set of locations using the AI model.
 * @param locations An array of WeatherPoint objects with location names and coordinates.
 * @param ai A GoogleGenAI instance.
 * @returns A promise that resolves to an array of updated WeatherPoint objects with live data.
 */
async function getLiveWeatherForTrip(locations: WeatherPoint[], ai: GoogleGenAI): Promise<Omit<WeatherPoint, 'lat' | 'lng'>[]> {
  const locationData = locations.map(l => ({ location: l.location, lat: l.lat, lng: l.lng }));

  const prompt = `
    Act as a live weather API. Based on the current, real-time weather conditions, provide a brief forecast and temperature for the following list of locations.
    Return the data as a JSON array that strictly matches the provided schema, with one weather entry for each location in the same order they were provided.

    Locations: ${JSON.stringify(locationData)}
  `;

  const weatherSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: "The location name, matching the input." },
        forecast: { type: Type.STRING, description: "e.g., 'Partly Cloudy'" },
        temperature: { type: Type.STRING, description: "e.g., '68°F / 20°C'" },
      },
      required: ['location', 'forecast', 'temperature'],
    }
  };

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: weatherSchema,
          temperature: 0.2,
        },
      });
      const text = response.text.trim();
      return JSON.parse(text);
  } catch(error) {
      console.error("Error fetching live weather:", error);
      throw new Error("Failed to fetch live weather data.");
  }
}

export async function generateTripPlan(
    destinations: string[], 
    travelDateTime: Date, 
    vehicleType: 'motorcycle' | 'car', 
    isElectric: boolean
): Promise<TripPlan> {
  if (!config.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set in config.");
  }
  
  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

  const start = destinations[0];
  const end = destinations[destinations.length - 1];
  const waypoints = destinations.slice(1, -1);

  const vehicleDescription = isElectric 
      ? `an electric ${vehicleType}` 
      : `a gas-powered ${vehicleType}`;

  const fuelTypeInstruction = isElectric
      ? "The list of 'fuelStops' must prioritize EV charging stations. Also provide their lat/lng coordinates and a URL."
      : "The list of 'fuelStops' should be petrol stations. Also provide their lat/lng coordinates and a URL.";
  
  const routeDescription = waypoints.length > 0 
      ? `from ${start} to ${end}, via the following stops in order: ${waypoints.join(', ')}.`
      : `from ${start} to ${end}.`;
      
  const advisoryType = vehicleType === 'motorcycle'
      ? "Crucial motorcycle-specific advisories (e.g., road conditions, crosswinds, wildlife, high-theft areas)."
      : "Crucial car-specific advisories (e.g., parking information, toll roads, narrow streets, road closures).";

  const now = new Date();
  const diffTime = travelDateTime.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const shouldFetchLiveWeather = diffDays >= 0 && diffDays <= 2; // Trip is today or tomorrow.

  let weatherInstruction: string;
  if (shouldFetchLiveWeather) {
      weatherInstruction = "For the 'weatherPoints' section, populate it with 5-7 key locations along the route, including their coordinates. For the 'forecast' and 'temperature' fields, use the placeholder text 'Live data unavailable' as this will be updated separately with real-time data.";
  } else {
      weatherInstruction = "For the 'weatherPoints' section, generate a predictive weather forecast for 5-7 key locations along the route, with coordinates, valid for the estimated time of arrival at those locations based on the travel date.";
  }


  const prompt = `
    Act as an expert trip planner for a ${vehicleDescription}. Create a detailed trip plan for a ride ${routeDescription}
    The user plans to depart on ${travelDateTime.toLocaleDateString()} at ${travelDateTime.toLocaleTimeString()}. All time-sensitive information like traffic should be based on this.

    The plan must be comprehensive and tailored for a ${vehicleType}. Include the following sections:
    1.  A catchy, inspiring title for the trip.
    2.  A summary with total distance and estimated driving time.
    3.  A list of logical waypoints describing each leg of the journey. This should incorporate the user's requested stops.
    4.  A 'routePath' of 15-20 latitude/longitude points that trace the recommended route for drawing on a map.
    5.  ${weatherInstruction}
    6.  'trafficAdvisories' highlighting areas known for congestion around the user's travel time.
    7.  ${fuelTypeInstruction}
    8.  3-5 interesting points of interest.
    9.  ${advisoryType} Assign a severity (Low, Medium, High).

    Generate the output in a structured JSON format that strictly adheres to the provided schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: tripPlanSchema,
        temperature: 0.7,
      },
    });
    
    const text = response.text.trim();
    if (!text.startsWith('{') || !text.endsWith('}')) {
        throw new Error("The AI returned an invalid response format. Please try again.");
    }

    const plan: TripPlan = JSON.parse(text);

    if (shouldFetchLiveWeather && plan.weatherPoints.length > 0) {
        console.log("Fetching live weather data for the trip...");
        try {
            const liveWeather = await getLiveWeatherForTrip(plan.weatherPoints, ai);
            if (liveWeather.length === plan.weatherPoints.length) {
                plan.weatherPoints.forEach((wp, index) => {
                    const liveData = liveWeather[index];
                    wp.forecast = liveData.forecast;
                    wp.temperature = liveData.temperature;
                });
                console.log("Successfully merged live weather data.");
            } else {
                 console.warn("Live weather data length mismatch, using placeholder data.");
            }
        } catch (e) {
            console.error("Could not fetch live weather, proceeding with placeholder data.", e);
            // The plan will retain the "Live data unavailable" placeholder, which is an acceptable fallback.
        }
    }

    return plan;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Failed to parse the trip plan from the AI. The format was invalid.");
    }
    throw new Error("Failed to generate trip plan. The AI model may be temporarily unavailable or the request was too complex.");
  }
}
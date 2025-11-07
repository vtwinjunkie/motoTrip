import React, { useState, useCallback } from 'react';
import type { TripPlan } from './types';
import { generateTripPlan } from './services/geminiService';
import TripPlannerForm from './components/TripPlannerForm';
import TripDetails from './components/TripDetails';
import LoadingSpinner from './components/LoadingSpinner';
import MapView from './components/MapView';

type View = 'details' | 'map';
type VehicleType = 'motorcycle' | 'car';

const App: React.FC = () => {
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('details');

  const [currentQuery, setCurrentQuery] = useState<{
    start: string;
    end: string;
    dateTime: string;
    vehicleType: VehicleType;
    isElectric: boolean;
  } | null>(null);

  const planTrip = useCallback(async (
    destinations: string[], 
    dateTime: string, 
    vehicleType: VehicleType, 
    isElectric: boolean
  ) => {
    if (destinations.some(d => !d) || !dateTime) {
      setError('Please fill in all fields: start, end, and date/time.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setTripPlan(null);

    // Store original query if it's a simple A->B trip
    if (destinations.length === 2) {
      setCurrentQuery({ start: destinations[0], end: destinations[1], dateTime, vehicleType, isElectric });
    }

    try {
      const plan = await generateTripPlan(destinations, new Date(dateTime), vehicleType, isElectric);
      setTripPlan(plan);
      setCurrentView('details');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while planning the trip.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFormSubmit = useCallback((
    start: string,
    end: string,
    dateTime: string,
    vehicleType: VehicleType,
    isElectric: boolean
  ) => {
    planTrip([start, end], dateTime, vehicleType, isElectric);
  }, [planTrip]);

  const handleRerouteWithStop = useCallback(async (stopLocation: string) => {
    if (!currentQuery) return;
    const { start, end, dateTime, vehicleType, isElectric } = currentQuery;
    console.log(`Rerouting from ${start} to ${end} via ${stopLocation}`);
    await planTrip([start, stopLocation, end], dateTime, vehicleType, isElectric);
  }, [currentQuery, planTrip]);

  const TabButton: React.FC<{ view: View; label: string }> = ({ view, label }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        currentView === view
          ? 'bg-blue-600 text-white'
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('https://picsum.photos/seed/moto/1920/1080')" }}>
      <div className="min-h-screen bg-black bg-opacity-70 backdrop-blur-sm">
        <main className="container mx-auto px-4 py-8 md:py-12">
          <header className="text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-shadow-lg">
              Moto Trip Planner <span className="text-blue-400">AI</span>
            </h1>
            <p className="mt-2 md:mt-4 text-lg md:text-xl text-gray-300">
              Your AI companion for the perfect ride.
            </p>
          </header>

          <div className="max-w-4xl mx-auto">
            <TripPlannerForm onPlanTrip={handleFormSubmit} isLoading={isLoading} />

            {error && (
              <div className="mt-8 bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                <p>{error}</p>
              </div>
            )}
            
            {isLoading && <LoadingSpinner />}

            {tripPlan && !isLoading && (
              <div className="mt-8 animate-fade-in">
                <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-t-xl shadow-2xl border-b border-gray-700">
                    <h2 className="text-3xl font-bold text-blue-400 mb-2">{tripPlan.tripTitle}</h2>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-300">
                      <p><span className="font-semibold">Distance:</span> {tripPlan.summary.totalDistance}</p>
                      <p><span className="font-semibold">Duration:</span> {tripPlan.summary.estimatedDuration}</p>
                    </div>
                </div>
                <div className="bg-gray-800/80 backdrop-blur-md p-4 rounded-b-xl shadow-2xl">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <TabButton view="details" label="Trip Details" />
                      <TabButton view="map" label="Live Map" />
                    </div>
                    
                    {currentView === 'details' ? <TripDetails plan={tripPlan} /> : <MapView plan={tripPlan} onReroute={handleRerouteWithStop} />}
                </div>
              </div>
            )}
          </div>
        </main>
        <footer className="text-center py-4 text-gray-500">
          <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
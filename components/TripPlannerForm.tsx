import React, { useState, useMemo } from 'react';
import { AutocompleteInput } from './AutocompleteInput';

type VehicleType = 'motorcycle' | 'car';

interface TripPlannerFormProps {
  onPlanTrip: (start: string, end: string, dateTime: string, vehicleType: VehicleType, isElectric: boolean) => void;
  isLoading: boolean;
}

const TripPlannerForm: React.FC<TripPlannerFormProps> = ({ onPlanTrip, isLoading }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle');
  const [isElectric, setIsElectric] = useState(false);
  
  const defaultDateTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now.toISOString().slice(0, 16);
  }, []);

  const [dateTime, setDateTime] = useState(defaultDateTime);

  const maxDateTime = useMemo(() => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    sevenDaysFromNow.setMinutes(sevenDaysFromNow.getMinutes() - sevenDaysFromNow.getTimezoneOffset());
    return sevenDaysFromNow.toISOString().slice(0, 16);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPlanTrip(start, end, dateTime, vehicleType, isElectric);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AutocompleteInput
            id="start"
            label="Start Destination"
            value={start}
            onValueChange={setStart}
            placeholder="e.g., San Francisco, CA"
        />
        <AutocompleteInput
            id="end"
            label="End Destination"
            value={end}
            onValueChange={setEnd}
            placeholder="e.g., Los Angeles, CA"
        />
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="datetime" className="block text-sm font-medium text-gray-300 mb-1">
                Date & Time of Travel
            </label>
            <input
                id="datetime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                min={defaultDateTime}
                max={maxDateTime}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Vehicle Type</label>
            <div className="flex items-center space-x-4 bg-gray-700/50 border border-gray-600 rounded-md p-2">
                <div className="flex-1">
                    <input type="radio" id="motorcycle" name="vehicleType" value="motorcycle" checked={vehicleType === 'motorcycle'} onChange={() => setVehicleType('motorcycle')} className="hidden" />
                    <label htmlFor="motorcycle" className={`w-full text-center text-sm py-1 rounded-md cursor-pointer transition ${vehicleType === 'motorcycle' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Motorcycle</label>
                </div>
                <div className="flex-1">
                    <input type="radio" id="car" name="vehicleType" value="car" checked={vehicleType === 'car'} onChange={() => setVehicleType('car')} className="hidden" />
                    <label htmlFor="car" className={`w-full text-center text-sm py-1 rounded-md cursor-pointer transition ${vehicleType === 'car' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Car</label>
                </div>
            </div>
          </div>
      </div>
      <div className="mt-4 flex items-center">
            <input
                id="is-electric"
                type="checkbox"
                checked={isElectric}
                onChange={(e) => setIsElectric(e.target.checked)}
                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is-electric" className="ml-2 block text-sm text-gray-300">
                Electric Vehicle
            </label>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
      >
        {isLoading ? 'Planning...' : 'Plan My Ride'}
      </button>
    </form>
  );
};

export default TripPlannerForm;

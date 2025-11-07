import React from 'react';
import type { TripPlan, Advisory } from '../types';
import { exportToGoogleMaps, exportToCSV } from '../services/exportService';
import { MapPinIcon, SunIcon, FuelIcon, CameraIcon, WarningIcon, SheetIcon, TrafficIcon } from './Icons';

interface TripDetailsProps {
  plan: TripPlan;
}

const getSeverityClass = (severity: Advisory['severity']) => {
  switch (severity) {
    case 'High':
      return 'border-red-500 bg-red-500/10 text-red-300';
    case 'Medium':
      return 'border-yellow-500 bg-yellow-500/10 text-yellow-300';
    case 'Low':
      return 'border-green-500 bg-green-500/10 text-green-300';
    default:
      return 'border-gray-600 bg-gray-600/10 text-gray-300';
  }
};

const TripDetails: React.FC<TripDetailsProps> = ({ plan }) => {
  return (
    <div className="space-y-6 p-1">
        <div className="flex flex-wrap gap-4">
            <button onClick={() => exportToGoogleMaps(plan)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300">
                <MapPinIcon className="h-5 w-5" /> Open in Google Maps
            </button>
            <button onClick={() => exportToCSV(plan)} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300">
                <SheetIcon className="h-5 w-5" /> Export to CSV
            </button>
        </div>

      <Section title="Route Waypoints" icon={<MapPinIcon />}>
        <ul className="space-y-4">
          {plan.waypoints.map((wp, index) => (
            <li key={index} className="p-4 bg-gray-700/50 rounded-lg">
              <p className="font-semibold text-blue-300">{wp.location}</p>
              <p className="text-gray-400">{wp.description}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Weather Forecast" icon={<SunIcon />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plan.weatherPoints.map((w, index) => (
            <div key={index} className="p-4 bg-gray-700/50 rounded-lg">
              <p className="font-semibold text-blue-300">{w.location}</p>
              <p className="text-gray-300">{w.forecast}</p>
              <p className="text-gray-400">Temp: {w.temperature}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Traffic Advisories" icon={<TrafficIcon />}>
        <ul className="space-y-4">
          {plan.trafficAdvisories.map((ta, index) => (
            <li key={index} className="p-4 bg-gray-700/50 rounded-lg">
              <p className="font-semibold text-blue-300">{ta.location}</p>
              <p className="text-gray-400">{ta.advisory}</p>
            </li>
          ))}
        </ul>
      </Section>
      
      <Section title="Fuel & Charging Stops" icon={<FuelIcon />}>
         <ul className="space-y-4">
          {plan.fuelStops.map((fs, index) => (
            <li key={index} className="p-4 bg-gray-700/50 rounded-lg">
              <p className="font-semibold text-blue-300">{fs.name} <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded-full ml-2">{fs.type}</span></p>
              <p className="text-gray-400">{fs.location}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Points of Interest" icon={<CameraIcon />}>
         <ul className="space-y-4">
          {plan.pointsOfInterest.map((poi, index) => (
             <li key={index} className="p-4 bg-gray-700/50 rounded-lg">
              <p className="font-semibold text-blue-300">{poi.name}</p>
              <p className="text-gray-400 italic mb-1">{poi.location}</p>
              <p className="text-gray-300">{poi.description}</p>
            </li>
          ))}
        </ul>
      </Section>
      
      <Section title="Motorcycle Advisories" icon={<WarningIcon />}>
        <ul className="space-y-4">
          {plan.motorcycleAdvisories.map((adv, index) => (
            <li key={index} className={`p-4 border-l-4 rounded-r-lg ${getSeverityClass(adv.severity)}`}>
              <p className="font-bold">{adv.title} <span className="text-sm font-medium ml-2">({adv.severity})</span></p>
              <p className="text-gray-400">{adv.details}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
};

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, children }) => (
    <div className="bg-gray-800/20 p-4 rounded-xl border border-gray-700">
        <h3 className="flex items-center gap-3 text-xl font-semibold mb-4 text-gray-100">
            {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6" })}
            {title}
        </h3>
        {children}
    </div>
);


export default TripDetails;
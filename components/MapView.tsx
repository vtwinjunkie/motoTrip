import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { TripPlan } from '../types';
import { exportToGoogleMaps } from '../services/exportService';
import { MapPinIcon, StopIcon, UserLocationIcon, FocusRouteIcon } from './Icons';

// This is required because we are loading Leaflet from a script tag
declare const L: any;

interface MapViewProps {
  plan: TripPlan;
  onReroute: (stopLocation: string) => void;
}

const MapView: React.FC<MapViewProps> = ({ plan, onReroute }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const planLayerGroupRef = useRef<any>(null);
  const weatherLayerRef = useRef<any>(null);
  const fuelStopsLayerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  const [isJourneyLive, setIsJourneyLive] = useState(false);

  const recenterMap = useCallback(() => {
    const map = mapInstanceRef.current;
    const polyline = routePolylineRef.current;
    if (map && polyline) {
      map.fitBounds(polyline.getBounds().pad(0.2));
    }
  }, []);
  
  // Effect for map setup and teardown (runs only once)
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      L.control.zoom({ position: 'bottomleft' }).addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);
  
  // Effect to draw route and handle events when plan changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !plan.routePath || plan.routePath.length === 0) {
      return;
    }

    if (planLayerGroupRef.current) {
        planLayerGroupRef.current.clearLayers();
    } else {
        planLayerGroupRef.current = L.layerGroup().addTo(map);
    }
    const group = planLayerGroupRef.current;
    
    routePolylineRef.current = null;
    weatherLayerRef.current = null;
    fuelStopsLayerRef.current = null;

    const latLngs = plan.routePath.map(p => [p.lat, p.lng]);
    const routePolyline = L.polyline(latLngs, { color: '#3b82f6', weight: 6, opacity: 0.8 }).addTo(group);
    routePolylineRef.current = routePolyline;

    L.marker(latLngs[0], { title: "Start" }).addTo(group).bindPopup('<b>Start</b><br/>' + plan.waypoints[0].location);
    L.marker(latLngs[latLngs.length - 1], { title: "End" }).addTo(group).bindPopup('<b>End</b><br/>' + plan.waypoints[plan.waypoints.length - 1].location);

    weatherLayerRef.current = L.layerGroup().addTo(group);
    fuelStopsLayerRef.current = L.layerGroup().addTo(group);

    const addWeatherMarkers = () => {
        if (!map || !weatherLayerRef.current) return;
        weatherLayerRef.current.clearLayers();
        plan.weatherPoints.forEach((weather, index) => {
            const onRouteLatLng = L.latLng(weather.lat, weather.lng);
            L.circleMarker(onRouteLatLng, { radius: 5, color: '#fff', weight: 1, fillColor: '#3b82f6', fillOpacity: 1 }).addTo(weatherLayerRef.current);
            const onRoutePoint = map.latLngToContainerPoint(onRouteLatLng);
            const offsetDirection = index % 2 === 0 ? 1 : -1;
            const bubblePoint = L.point(onRoutePoint.x + (100 * offsetDirection), onRoutePoint.y - 40);
            const bubbleLatLng = map.containerPointToLatLng(bubblePoint);
            L.polyline([onRouteLatLng, bubbleLatLng], { color: '#6b7280', weight: 1, dashArray: '4, 4' }).addTo(weatherLayerRef.current);
            const weatherIcon = L.divIcon({
                className: 'weather-marker',
                html: `<div class="bg-gray-800 text-white p-2 rounded-lg shadow-lg border border-blue-500 text-center w-[120px]">
                        <p class="font-bold text-sm truncate">${weather.location}</p>
                        <p class="text-xs">${weather.forecast}</p>
                       </div>`,
                iconSize: [120, 40],
                iconAnchor: [60, 50],
            });
            L.marker(bubbleLatLng, { icon: weatherIcon }).addTo(weatherLayerRef.current);
        });
    };

    const addFuelStopMarkers = () => {
        if (!fuelStopsLayerRef.current) return;
        const fuelGroup = fuelStopsLayerRef.current;
        fuelGroup.clearLayers();

        const lightningIcon = L.divIcon({
            html: `<div class="bg-gray-800 rounded-full p-1 shadow-lg border-2 border-yellow-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>`,
            className: '',
            iconSize: [28, 28],
        });

        plan.fuelStops?.forEach(stop => {
            if (stop.type === 'EV Charger' || stop.type === 'Both') {
                const marker = L.marker([stop.lat, stop.lng], { icon: lightningIcon, zIndexOffset: 500 }).addTo(fuelGroup);
                const popupContent = `
                    <div class="text-white">
                        <p class="font-bold">${stop.name}</p>
                        <p class="text-xs text-gray-300">${stop.location}</p>
                        ${stop.url ? `<a href="${stop.url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 text-xs hover:underline">More Info</a>` : ''}
                        <button id="reroute-btn-${stop.lat}-${stop.lng}" class="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded">
                            Add to Route
                        </button>
                    </div>
                `;
                marker.bindPopup(popupContent, { minWidth: 150 });
            }
        });
    };
    
    const handleResize = () => {
      map.invalidateSize();
      recenterMap();
    };

    const handlePopupOpen = (e: any) => {
      const popupNode = e.popup.getElement();
      if (!popupNode) return;
      const rerouteButton = popupNode.querySelector('[id^="reroute-btn-"]');
      if (rerouteButton) {
        const id = rerouteButton.id;
        const parts = id.split('-');
        const lat = parseFloat(parts[2]);
        const lng = parseFloat(parts[3]);

        const stop = plan.fuelStops.find(s => s.lat === lat && s.lng === lng);
        if (stop) {
          const handleClick = () => {
            onReroute(stop.location);
            map.closePopup();
          };
          // Use L.DomEvent to handle click, preventing multiple bindings
          L.DomEvent.on(rerouteButton, 'click', handleClick);
          // Clean up the listener when the popup closes
          map.once('popupclose', () => L.DomEvent.off(rerouteButton, 'click', handleClick));
        }
      }
    };

    map.on('zoomend moveend', addWeatherMarkers);
    map.on('popupopen', handlePopupOpen);
    window.addEventListener('resize', handleResize);

    recenterMap();
    const timer = setTimeout(() => {
      addWeatherMarkers();
      addFuelStopMarkers();
    }, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.off('zoomend moveend', addWeatherMarkers);
      map.off('popupopen', handlePopupOpen);
      clearTimeout(timer);
    };
  }, [plan, recenterMap, onReroute]);
  
  const handleStopJourney = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsJourneyLive(false);
    if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
    }
  }, []);

  const handleStartJourney = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    setIsJourneyLive(true);
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = L.latLng(latitude, longitude);
        const map = mapInstanceRef.current;

        if (map) {
           if (!userMarkerRef.current) {
               const userIcon = L.divIcon({
                   className: 'user-location-marker',
                   html: `<div class="pulse"></div>`,
                   iconSize: [20, 20],
               });
               userMarkerRef.current = L.marker(newPos, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
           } else {
               userMarkerRef.current.setLatLng(newPos);
           }
           map.panTo(newPos);
        }
      },
      (error: GeolocationPositionError) => {
        console.error(`Geolocation error: ${error.message} (Code: ${error.code})`);
        let userMessage = "Could not get your location.";
        if (error.code === 1) userMessage = "Location access denied. Please enable it in your browser settings.";
        alert(userMessage);
        handleStopJourney();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [handleStopJourney]);


  return (
    <div className="p-1">
      <div className="relative">
        <div ref={mapContainerRef} style={{ height: '60vh', borderRadius: '12px', zIndex: 0, backgroundColor: '#374151' }} />
        <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-3">
             <button onClick={recenterMap} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-5 rounded-xl transition duration-300 shadow-lg">
                <FocusRouteIcon className="h-5 w-5" /> Recenter Route
            </button>
             {isJourneyLive ? (
                 <button onClick={handleStopJourney} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded-xl transition duration-300 shadow-lg">
                    <StopIcon className="h-5 w-5" /> Stop Journey
                </button>
             ) : (
                <button onClick={handleStartJourney} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-5 rounded-xl transition duration-300 shadow-lg">
                    <UserLocationIcon className="h-5 w-5" /> Start Live Journey
                </button>
             )}
            <button onClick={() => exportToGoogleMaps(plan)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl transition duration-300 shadow-lg">
                <MapPinIcon className="h-5 w-5" /> Export to Google Maps
            </button>
        </div>
      </div>
    </div>
  );
};

export default MapView;
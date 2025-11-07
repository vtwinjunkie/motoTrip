import type { TripPlan } from '../types';

export function exportToGoogleMaps(plan: TripPlan) {
  if (!plan.waypoints || plan.waypoints.length < 1) {
    alert("Not enough waypoints to generate a map link.");
    return;
  }

  const baseUrl = "https://www.google.com/maps/dir/?api=1";
  
  // Use the first and last points from routePath for more accurate start/end if available
  const origin = plan.routePath?.[0] 
    ? `${plan.routePath[0].lat},${plan.routePath[0].lng}` 
    : encodeURIComponent(plan.waypoints[0].location);

  const destination = plan.routePath?.[plan.routePath.length - 1] 
    ? `${plan.routePath[plan.routePath.length - 1].lat},${plan.routePath[plan.routePath.length - 1].lng}` 
    : encodeURIComponent(plan.waypoints[plan.waypoints.length - 1].location);
  
  const waypoints = plan.waypoints.slice(1, -1).map(wp => encodeURIComponent(wp.location)).join('|');
  const waypointsParam = waypoints ? `&waypoints=${waypoints}` : '';

  const travelMode = "&travelmode=driving";

  const url = `${baseUrl}&origin=${origin}&destination=${destination}${waypointsParam}${travelMode}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}


function escapeCsvCell(cell: string | number | undefined): string {
    if (cell === undefined) return '';
    const strCell = String(cell);
    if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
        return `"${strCell.replace(/"/g, '""')}"`;
    }
    return strCell;
}

export function exportToCSV(plan: TripPlan) {
    let csvContent = "Category,Name/Title,Location/Details,Description,Severity/Type\n";

    plan.waypoints.forEach(wp => {
        csvContent += `Waypoint,${escapeCsvCell(wp.location)},,${escapeCsvCell(wp.description)},\n`;
    });

    plan.fuelStops.forEach(fs => {
        csvContent += `Fuel Stop,${escapeCsvCell(fs.name)},${escapeCsvCell(fs.location)},,${escapeCsvCell(fs.type)}\n`;
    });

    plan.pointsOfInterest.forEach(poi => {
        csvContent += `Point of Interest,${escapeCsvCell(poi.name)},${escapeCsvCell(poi.location)},${escapeCsvCell(poi.description)},\n`;
    });

    plan.weatherPoints.forEach(w => {
        csvContent += `Weather,${escapeCsvCell(w.location)},${escapeCsvCell(w.temperature)},${escapeCsvCell(w.forecast)},\n`;
    });

    plan.trafficAdvisories.forEach(ta => {
        csvContent += `Traffic Advisory,${escapeCsvCell(ta.location)},,${escapeCsvCell(ta.advisory)},\n`;
    });

    plan.motorcycleAdvisories.forEach(adv => {
        csvContent += `Advisory,${escapeCsvCell(adv.title)},${escapeCsvCell(adv.details)},,${escapeCsvCell(adv.severity)}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fileName = plan.tripTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute("download", `${fileName}_trip_plan.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
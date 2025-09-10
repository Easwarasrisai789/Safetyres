import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function DriverMap({ driverLocation, destination }) {
  const mapRef = useRef(null);
  const markersRef = useRef({ driver: null, dest: null });
  const routeRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('driver-map', { zoomControl: true, scrollWheelZoom: true }).setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      mapRef.current = map;
    }

    const map = mapRef.current;

    // Driver marker
    if (driverLocation && typeof driverLocation.latitude === 'number' && typeof driverLocation.longitude === 'number') {
      const latlng = [driverLocation.latitude, driverLocation.longitude];
      if (!markersRef.current.driver) {
        markersRef.current.driver = L.marker(latlng, { icon: defaultIcon }).addTo(map).bindPopup('Driver');
      } else {
        markersRef.current.driver.setLatLng(latlng);
      }
    }

    // Destination marker
    if (destination && typeof destination.latitude === 'number' && typeof destination.longitude === 'number') {
      const latlng = [destination.latitude, destination.longitude];
      if (!markersRef.current.dest) {
        markersRef.current.dest = L.marker(latlng, { icon: defaultIcon }).addTo(map).bindPopup('Destination');
      } else {
        markersRef.current.dest.setLatLng(latlng);
      }
    }

    // Fit bounds
    const points = [];
    if (markersRef.current.driver) points.push(markersRef.current.driver.getLatLng());
    if (markersRef.current.dest) points.push(markersRef.current.dest.getLatLng());
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    // Draw route via OSRM if both available
    const drawRoute = async () => {
      if (!(markersRef.current.driver && markersRef.current.dest)) return;
      const a = markersRef.current.driver.getLatLng();
      const b = markersRef.current.dest.getLatLng();
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        const coords = data?.routes?.[0]?.geometry?.coordinates || [];
        if (coords.length) {
          const latlngs = coords.map(([lng, lat]) => [lat, lng]);
          if (routeRef.current) {
            routeRef.current.setLatLngs(latlngs);
          } else {
            routeRef.current = L.polyline(latlngs, { color: '#1e88e5', weight: 5, opacity: 0.9 }).addTo(map);
          }
        }
      } catch (e) {
        // ignore routing errors
      }
    };
    drawRoute();

    return () => {
      // keep map across renders; no cleanup
    };
  }, [driverLocation, destination]);

  return (
    <div id="driver-map" style={{ width: '100%', height: 240, borderRadius: 8, overflow: 'hidden' }} />
  );
}



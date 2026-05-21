import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const SookmyungLocation = [37.546, 126.964];

// Component to handle map view updates
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

const MapArea = ({ routeData }) => {
  const mapCenter = routeData && routeData.startCoords ? routeData.startCoords : SookmyungLocation;
  
  return (
    <div className="map-container">
      <MapContainer 
        center={SookmyungLocation} 
        zoom={16} 
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Route visualization based on data */}
        {routeData && routeData.path && (
          <Polyline 
            positions={routeData.path} 
            color="var(--primary-color)" 
            weight={6}
            opacity={0.7}
          />
        )}

        {routeData && routeData.startCoords && (
          <Marker position={routeData.startCoords}>
            <Popup className="custom-popup">
              <b>출발:</b> {routeData.startName}
            </Popup>
          </Marker>
        )}

        {routeData && routeData.endCoords && (
          <Marker position={routeData.endCoords}>
            <Popup className="custom-popup">
              <b>도착:</b> {routeData.endName}
            </Popup>
          </Marker>
        )}
        
        <MapUpdater center={mapCenter} zoom={16.5} />
      </MapContainer>
    </div>
  );
};

export default MapArea;

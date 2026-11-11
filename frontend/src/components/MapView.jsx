import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";

const markerIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function FitMarkers({ items }) {
  const map = useMap();

  useEffect(() => {
  const valid = items.filter(
    item => Number.isFinite(item.latitude) &&
            Number.isFinite(item.longitude)
  );

  if (valid.length) {
    const bounds = L.latLngBounds(
      valid.map(item => [item.latitude, item.longitude])
    );
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }
}, [items, map]);

  return null;
}

export default function MapView({ complaints = [] }) {
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");

  const visible = complaints.filter(item => {
    const statusMatch = status === "All" || item.status === status;
    const categoryMatch = category === "All" || item.aiCategory === category;

    return statusMatch && categoryMatch &&
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude);
  });

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Complaint GPS Map</h2>
          <p>View complaint locations and filter the markers.</p>
        </div>

        <div className="map-filters">
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option>All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </select>

          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option>All</option>
            <option>Pipeline Leakage</option>
            <option>No Water Supply</option>
            <option>Water Contamination</option>
            <option>Low Water Pressure</option>
            <option>Overflow / Wastage</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <MapContainer
        center={[16.5062, 80.6480]}
        zoom={11}
        scrollWheelZoom
        className="map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMarkers items={visible} />

        {visible.map(item => (
          <Marker
            key={item.id}
            position={[item.latitude, item.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <strong>{item.complaintId}</strong>
              <br />
              {item.aiCategory}
              <br />
              {item.area}
              <br />
              Status: {item.status}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <p className="muted">
        Showing {visible.length} complaint locations. Complaints without GPS
        coordinates cannot appear on the map.
      </p>
    </section>
  );
}
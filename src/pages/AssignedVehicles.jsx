// src/pages/AssignedVehicles.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db, authReady } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import AdminNavbar from "../components/AdminNavbar";
// live driver list via onSnapshot

// Table cell styles
const thStyle = {
  padding: "10px",
  textAlign: "left",
  border: "1px solid #ddd",
};

const tdStyle = {
  padding: "8px",
  border: "1px solid #ddd",
  backgroundColor: "white",
};

// ✅ Default vehicles pool
const defaultVehicles = {
  ambulance: Array.from({ length: 10 }, (_, i) => ({
    id: `Ambulance-${i + 1}`,
    available: true,
  })),
  fireengine: Array.from({ length: 10 }, (_, i) => ({
    id: `FireEngine-${i + 1}`,
    available: true,
  })),
  policevan: Array.from({ length: 10 }, (_, i) => ({
    id: `PoliceVan-${i + 1}`,
    available: true,
  })),
};

export default function AssignedVehicles() {
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState(defaultVehicles);
  const [drivers, setDrivers] = useState([]);

  // ✅ Fetch accepted/assigned requests in realtime
  useEffect(() => {
    let unsubscribe = null;
    let active = true;
    authReady.then(() => {
      if (!active) return;
      unsubscribe = onSnapshot(collection(db, "emergencyRequests"), (snapshot) => {
        const reqs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRequests(
          reqs.filter((r) =>
            (r.status === "Accepted" || r.status === "assigned")
          )
      );
    });
    });
    return () => { active = false; if (unsubscribe) unsubscribe(); };
  }, []);

  // Load drivers for assignment select (realtime)
  useEffect(() => {
    let unsubscribe = null;
    let active = true;
    authReady.then(() => {
      if (!active) return;
      unsubscribe = onSnapshot(collection(db, 'drivers'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDrivers(list);
      });
    });
    return () => { active = false; if (unsubscribe) unsubscribe(); };
  }, []);

  // ✅ Assign a vehicle
  const assignVehicle = async (request) => {
    const type = request.vehicleType?.toLowerCase();
    const inferredType = type || request.assignedVehicleType || "ambulance";
    if (!inferredType || !vehicles[inferredType]) {
      alert("Invalid vehicle type requested");
      return;
    }

    // Find first available vehicle of this type
    const availableVehicle = vehicles[inferredType].find((v) => v.available);
    if (!availableVehicle) {
      alert(`No ${inferredType} available right now`);
      return;
    }

    // Mark this vehicle as unavailable in local state
    setVehicles((prev) => ({
      ...prev,
      [inferredType]: prev[inferredType].map((v) =>
        v.id === availableVehicle.id ? { ...v, available: false } : v
      ),
    }));

    // Update Firestore with assignment
    const requestRef = doc(db, "emergencyRequests", request.id);
    await updateDoc(requestRef, {
      assignedVehicle: availableVehicle.id,
      assignedUser: request.name || null,
      assignedVehicleType: inferredType,
      vehicleAssignedAt: serverTimestamp(),
      status: "assigned",
    });

    // ✅ Release vehicle after 10 minutes (locally; Firestore remains historical)
    setTimeout(() => {
      setVehicles((prev) => ({
        ...prev,
        [inferredType]: prev[inferredType].map((v) =>
          v.id === availableVehicle.id ? { ...v, available: true } : v
        ),
      }));
    }, 10 * 60 * 1000);
  };

  const assignDriver = async (requestId, driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;
    const reqRef = doc(db, 'emergencyRequests', requestId);
    await updateDoc(reqRef, {
      assignedDriverId: driverId,
      assignedDriverEmail: driver.email || null,
    });
    const drvRef = doc(db, 'drivers', driverId);
    await updateDoc(drvRef, {
      assignedVehicle: requests.find((r) => r.id === requestId)?.assignedVehicle || null,
      available: false,
    });
  };

  // Vehicle type is fixed by the user's original request; no manual changes here

  // Compute remaining time for assigned vehicles (client-side countdown)
  const now = Date.now();
  const withCountdown = useMemo(() => {
    const inferType = (r) => {
      const text = `${r.vehicle || ''} ${r.situation || ''}`.toLowerCase();
      if ((r.assignedVehicleType || r.vehicleType)) return (r.assignedVehicleType || r.vehicleType).toLowerCase();
      if (text.includes('fire')) return 'fireengine';
      if (text.includes('police') || text.includes('crime')) return 'policevan';
      return 'ambulance';
    };
    return requests.map((r) => {
      // prefer vehicleAssignedAt, fallback to request timestamp
      const assignedAtMs = r.vehicleAssignedAt?.seconds
        ? r.vehicleAssignedAt.seconds * 1000
        : (r.vehicleAssignedAt ? Date.parse(r.vehicleAssignedAt) : (
            r.timestamp?.seconds ? r.timestamp.seconds * 1000 : (r.timestamp ? Date.parse(r.timestamp) : null)
          ));
      let remainingMs = null;
      let completionAt = null;
      if (assignedAtMs) {
        const end = assignedAtMs + 10 * 60 * 1000;
        remainingMs = Math.max(0, end - now);
        completionAt = new Date(end);
      }
      const completionStr = completionAt ? completionAt.toLocaleString() : null;
      const resolvedVehicleType = inferType(r);
      const assignedAtStr = assignedAtMs ? new Date(assignedAtMs).toLocaleString() : null;
      return { ...r, remainingMs, completionStr, resolvedVehicleType, assignedAtStr };
    });
  }, [requests, now]);

  // Ticker to refresh countdowns
  useEffect(() => {
    const id = setInterval(() => {
      // force rerender by touching state
      setRequests((prev) => [...prev]);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-6" style={{ marginLeft: 220 }}>
      <AdminNavbar />
      <h1 className="text-2xl font-bold mb-4">Assigned Vehicles</h1>

      {requests.length === 0 ? (
        <p>No accepted requests.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', background: '#fff' }}>
          <thead>
            <tr style={{ background: '#f1f3f5' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Vehicle Type</th>
              <th style={thStyle}>Assigned Vehicle</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Destination</th>
              <th style={thStyle}>Releases In</th>
              <th style={thStyle}>Assigned Date & Time</th>
              <th style={thStyle}>Completion Time</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {withCountdown.map((req) => (
              <tr key={req.id}>
                <td style={tdStyle}>{req.name || '-'}</td>
                <td style={tdStyle}>{req.resolvedVehicleType || 'N/A'}</td>
                <td style={tdStyle}>{req.assignedVehicle || <span style={{ color: '#888' }}>Not Assigned</span>}</td>
                <td style={tdStyle}>
                  {req.assignedDriverId ? (
                    drivers.find((d) => d.id === req.assignedDriverId)?.name || drivers.find((d) => d.id === req.assignedDriverId)?.email || 'Assigned'
                  ) : (
                    (() => {
                      const requiredType = (req.resolvedVehicleType || '').toLowerCase();
                      const eligible = drivers.filter((d) => (d.available !== false) && ((d.vehicleType || '').toLowerCase() === requiredType));
                      return eligible.length > 0 ? (
                        <select
                          value=""
                          onChange={(e) => assignDriver(req.id, e.target.value)}
                        >
                          <option value="" disabled>Select driver</option>
                          {eligible.map((d) => (
                            <option key={d.id} value={d.id}>{d.name || d.email || d.id}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: '#888' }}>No available drivers for {requiredType || 'type'}</span>
                      );
                    })()
                  )}
                </td>
                <td style={tdStyle}>
                  {req.latitude && req.longitude ? (
                    <a href={`https://www.google.com/maps?q=${req.latitude},${req.longitude}`} target="_blank" rel="noreferrer">View Map</a>
                  ) : '-'}
                </td>
                <td style={tdStyle}>
                  {req.remainingMs !== null ? `${Math.floor(req.remainingMs / 60000)}m ${Math.floor((req.remainingMs % 60000)/1000)}s` : '-'}
                </td>
                <td style={tdStyle}>{req.assignedAtStr || '-'}</td>
                <td style={tdStyle}>{req.completionStr || '-'}</td>
                <td style={tdStyle}>{req.status}</td>
                <td style={tdStyle}>
              <button
                    className={`px-4 py-2 rounded-lg ${req.assignedVehicle ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                onClick={() => assignVehicle(req)}
                disabled={!!req.assignedVehicle}
                    style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: req.assignedVehicle ? 'default' : 'pointer', background: req.assignedVehicle ? '#9e9e9e' : '#1e88e5', color: '#fff' }}
              >
                    {req.assignedVehicle ? 'Assigned' : 'Assign'}
              </button>
                </td>
              </tr>
          ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

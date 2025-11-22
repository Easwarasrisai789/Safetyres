// src/pages/AssignedVehicles.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db, authReady } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import AdminNavbar from "../components/AdminNavbar";

// --- UI styles (kept simple, moved some to CSS below for neatness) ---
const thStyle = {
  padding: "12px",
  background: "#f1f3f5",
  borderBottom: "2px solid #d9d9d9",
  textAlign: "left",
  fontWeight: "700",
  fontSize: "14px",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #eee",
  background: "white",
  fontSize: "14px",
};

// Default vehicles keyed by normalized type names
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

// Helper - normalize various forms like "Fire Engine", "fire-engine", "FireEngine" -> "fireengine"
const normalizeType = (raw) => {
  if (!raw && raw !== "") return "";
  return raw
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // remove spaces and punctuation
};

export default function AssignedVehicles() {
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState(defaultVehicles);
  const [drivers, setDrivers] = useState([]);

  // UI Filters
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("All");

  // --- Fetch Requests ---
  useEffect(() => {
    let unsubscribe;
    authReady.then(() => {
      unsubscribe = onSnapshot(
        collection(db, "emergencyRequests"),
        (snapshot) => {
          const list = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          list.sort(
            (a, b) =>
              (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
          );
          // keep only accepted/assigned as before
          setRequests(
            list.filter(
              (r) => r.status === "Accepted" || r.status === "assigned"
            )
          );
        }
      );
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // --- Fetch Drivers ---
  useEffect(() => {
    let unsubscribe;
    authReady.then(() => {
      unsubscribe = onSnapshot(collection(db, "drivers"), (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setDrivers(list);
      });
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // --- Assign Vehicle ---
  const assignVehicle = async (request) => {
    // normalize the requested type from multiple possible fields
    const rawType =
      request.resolvedVehicleType || request.vehicleType || request.vehicle || "";
    const type = normalizeType(rawType) || "ambulance";

    const availableVehicle = vehicles[type]?.find((v) => v.available);
    if (!availableVehicle) {
      alert(`No ${type} available now`);
      return;
    }

    setVehicles((prev) => ({
      ...prev,
      [type]: prev[type].map((v) =>
        v.id === availableVehicle.id ? { ...v, available: false } : v
      ),
    }));

    try {
      await updateDoc(doc(db, "emergencyRequests", request.id), {
        assignedVehicle: availableVehicle.id,
        assignedVehicleType: type,
        vehicleAssignedAt: serverTimestamp(),
        status: "assigned",
      });
    } catch (err) {
      console.error("assignVehicle error:", err);
      alert("Failed to assign vehicle. Check console.");
    }
  };

  // --- Assign Driver (no backend mail) ---
  const assignDriver = async (requestId, driverId) => {
    try {
      const driver = drivers.find((d) => d.id === driverId);
      const request = requests.find((r) => r.id === requestId);

      if (!driver) {
        alert("Driver not found");
        return;
      }
      if (!request) {
        alert("Request not found");
        return;
      }

      // 1) Update emergency request with driver assignment
      await updateDoc(doc(db, "emergencyRequests", requestId), {
        assignedDriverId: driverId,
        assignedDriverEmail: driver.email || null,
      });

      // 2) Update driver document to mark unavailable and assign vehicle if present
      await updateDoc(doc(db, "drivers", driverId), {
        assignedVehicle: request.assignedVehicle || null,
        available: false,
      });

      alert("Driver assigned successfully.");
    } catch (err) {
      console.error("assignDriver error:", err);
      alert("Failed to assign driver. See console for details.");
    }
  };

  // --- Delete record manually (with release of driver & local vehicle) ---
  const deleteRequestRecord = async (request) => {
    try {
      const confirmDelete = window.confirm(
        `Delete request for "${request.name || "Unknown"}"? This action cannot be undone.`
      );
      if (!confirmDelete) return;

      // If a driver was assigned, attempt to mark driver as available again
      if (request.assignedDriverId) {
        try {
          await updateDoc(doc(db, "drivers", request.assignedDriverId), {
            available: true,
            assignedVehicle: null,
          });
        } catch (err) {
          // non-fatal if driver update fails
          console.warn("Failed to release driver:", err);
        }
      }

      // Update local vehicles state to free up the vehicle if it was assigned
      const assignedVehicleId = request.assignedVehicle;
      const assignedTypeRaw =
        request.assignedVehicleType || request.vehicle || request.vehicleType || "";
      const assignedType = normalizeType(assignedTypeRaw) || null;

      if (assignedType && assignedVehicleId) {
        setVehicles((prev) => {
          const list = prev[assignedType] || [];
          return {
            ...prev,
            [assignedType]: list.map((v) =>
              v.id === assignedVehicleId ? { ...v, available: true } : v
            ),
          };
        });
      }

      // Finally delete the request document
      await deleteDoc(doc(db, "emergencyRequests", request.id));

      alert("Request deleted successfully.");
    } catch (err) {
      console.error("deleteRequestRecord error:", err);
      alert("Failed to delete request. See console for details.");
    }
  };

  // --- Countdown Logic & resolvedVehicleType normalization ---
  const now = Date.now();
  const withCountdown = useMemo(() => {
    return requests.map((r) => {
      const assignedMs = r.vehicleAssignedAt?.seconds
        ? r.vehicleAssignedAt.seconds * 1000
        : null;
      const remainingMs = assignedMs
        ? Math.max(0, assignedMs + 600000 - now)
        : null;

      // Normalize vehicle type from multiple possible fields (assignedVehicleType, vehicleType, vehicle)
      const rawType =
        r.assignedVehicleType || r.vehicleType || r.vehicle || "";
      const resolvedNormalized = normalizeType(rawType) || "ambulance";

      return {
        ...r,
        remainingMs,
        assignedAtStr: assignedMs
          ? new Date(assignedMs).toLocaleString()
          : "-",
        completionStr: assignedMs
          ? new Date(assignedMs + 600000).toLocaleString()
          : "-",
        // keep both original-ish display and normalized type:
        resolvedVehicleType: resolvedNormalized, // normalized key (ambulance, fireengine, policevan)
        resolvedVehicleTypeDisplay:
          r.assignedVehicleType ||
          r.vehicleType ||
          r.vehicle ||
          resolvedNormalized, // human-friendly fallback if original exists
      };
    });
  }, [requests, now]);

  useEffect(() => {
    const id = setInterval(() => setRequests((prev) => [...prev]), 1000);
    return () => clearInterval(id);
  }, []);

  // --- FILTER DATA ---
  const filteredData = withCountdown.filter((req) => {
    const matchesSearch =
      req.name?.toLowerCase().includes(search.toLowerCase()) ||
      (req.situation || "").toLowerCase().includes(search.toLowerCase()) ||
      (req.phone || "").toLowerCase().includes(search.toLowerCase());

    const matchesVehicle =
      vehicleFilter === "All" ||
      normalizeType(req.resolvedVehicleType || req.vehicle || "") ===
        normalizeType(vehicleFilter === "All" ? "" : vehicleFilter);

    return matchesSearch && matchesVehicle;
  });

  // Helper to display map safely
  const mapLinkFor = (req) => {
    const lat =
      req.latitude ??
      req.location?.latitude ??
      req.lat ??
      req.locationLat ??
      null;
    const lon =
      req.longitude ??
      req.location?.longitude ??
      req.lng ??
      req.locationLon ??
      null;
    if (lat == null || lon == null) return "";
    return `https://www.google.com/maps?q=${lat},${lon}`;
  };

  return (
    <div style={{ marginLeft: 220, padding: "20px" }}>
      {/* Inline CSS block for hover/focus/neat styling */}
      <style>{`
        .av-container { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #222; }
        .av-card { border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(16,24,40,0.08); }
        .av-table tbody tr:hover { background: #f8fbff; }
        .btn { padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; }
        .btn:focus { outline: 2px solid rgba(0,123,255,0.25); outline-offset: 2px; }
        .btn-assign { background: linear-gradient(90deg,#007bff,#00c6ff); color: white; box-shadow: 0 4px 12px rgba(0,123,255,0.15); }
        .btn-assign[disabled] { background: #ddd; color: #777; box-shadow: none; cursor: not-allowed; }
        .btn-delete { background: transparent; color: #e53935; border: 1px solid rgba(229,57,53,0.12); }
        .btn-delete:hover { background: rgba(229,57,53,0.06); }
        .driver-select { padding: 6px 10px; border-radius: 8px; border: 1px solid #d9e2ef; }
        .filter-input { padding: 10px; border-radius: 8px; border: 1px solid #e6eef8; }
        .header-gradient { background: linear-gradient(90deg,#0f74ff,#00c6ff); padding: 20px; border-radius: 12px; color: #fff; margin-bottom: 20px; }
        .small-muted { color: #6b7280; font-size: 13px; }
        .map-link { color: #0f74ff; text-decoration: none; font-weight: 600; }
        @media (max-width: 900px) {
          .av-table { font-size: 13px; }
          .btn { padding: 6px 10px; font-size: 13px; }
        }
      `}</style>

      <div className="av-container">
        <AdminNavbar />

        {/* HEADER */}
        <div className="header-gradient">
          <h1 style={{ margin: 0, fontSize: 20 }}>🚑 Assigned Vehicles Dashboard</h1>
          <div style={{ marginTop: 6, fontSize: 13 }} className="small-muted">
            Manage assigned vehicles, drivers and remove requests manually.
          </div>
        </div>

        {/* FILTER BAR */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center" }}>
          <input
            className="filter-input"
            type="text"
            placeholder="Search name, phone or situation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
            }}
          />

          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #e6eef8",
            }}
          >
            <option value="All">All Vehicles</option>
            {/* NOTE: the option values are the human names; code uses normalizeType when comparing */}
            <option value="ambulance">Ambulance</option>
            <option value="fireengine">Fire Engine</option>
            <option value="policevan">Police Van</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="av-card" style={{ borderRadius: 12 }}>
          <table className="av-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Vehicle</th>
                <th style={thStyle}>Driver</th>
                <th style={thStyle}>Map</th>
                <th style={thStyle}>Releases In</th>
                <th style={thStyle}>Assigned</th>
                <th style={thStyle}>Completion</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((req) => (
                <tr key={req.id}>
                  <td style={tdStyle}>{req.name}</td>

                  <td style={tdStyle}>
                    <span style={{
                      padding: "6px 12px",
                      borderRadius: "20px",
                      background: "#007bff",
                      color: "white",
                      textTransform: "capitalize",
                      fontSize: 13,
                    }}>
                      {/* show a friendly label when possible */}
                      {req.resolvedVehicleTypeDisplay || req.resolvedVehicleType}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    {req.assignedVehicle || "Not Assigned"}
                  </td>

                  {/* DRIVER DROPDOWN */}
                  <td style={tdStyle}>
                    {req.assignedDriverId ? (
                      drivers.find((d) => d.id === req.assignedDriverId)?.name ||
                      drivers.find((d) => d.id === req.assignedDriverId)?.email
                    ) : (
                      (() => {
                        const needed = req.resolvedVehicleType || normalizeType(req.vehicle || "");
                        const eligible = drivers.filter(
                          (d) =>
                            d.available !== false &&
                            normalizeType(d.vehicleType || d.assignedVehicleType || "") === needed
                        );
                        return eligible.length > 0 ? (
                          <select
                            className="driver-select"
                            onChange={(e) => {
                              if (e.target.value) assignDriver(req.id, e.target.value);
                            }}
                          >
                            <option value="">Select Driver</option>
                            {eligible.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name || d.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ color: "#999" }}>No drivers</span>
                        );
                      })()
                    )}
                  </td>

                  <td style={tdStyle}>
                    {mapLinkFor(req) ? (
                      <a
                        className="map-link"
                        href={mapLinkFor(req)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      <span className="small-muted">No coords</span>
                    )}
                  </td>

                  <td style={tdStyle}>
                    {req.remainingMs
                      ? `${Math.floor(req.remainingMs / 60000)}m ${Math.floor((req.remainingMs % 60000) / 1000)}s`
                      : "—"}
                  </td>

                  <td style={tdStyle}>{req.assignedAtStr}</td>
                  <td style={tdStyle}>{req.completionStr}</td>
                  <td style={tdStyle}>{req.status}</td>

                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        className="btn btn-assign"
                        onClick={() => assignVehicle(req)}
                        disabled={Boolean(req.assignedVehicle)}
                        title={req.assignedVehicle ? "Vehicle already assigned" : "Assign vehicle"}
                        style={{ padding: "7px 10px" }}
                      >
                        {req.assignedVehicle ? "Assigned" : "Assign"}
                      </button>

                      <button
                        className="btn btn-delete"
                        onClick={() => deleteRequestRecord(req)}
                        title="Delete request"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: "center", color: "#6b7280" }}>
                    No requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

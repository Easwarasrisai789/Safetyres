import React, { useState, useEffect } from "react";
import { db, authReady } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import AdminNavbar from "../components/AdminNavbar";

const AcceptedRequests = () => {
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let unsubscribe = null;
    let active = true;

    authReady.then(() => {
      if (!active) return;

      const q = query(
        collection(db, "emergencyRequests"),
        where("status", "==", "Accepted")
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        let reqData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestampObj: data.timestamp || null,
            dateTime: data.timestamp
              ? new Date(data.timestamp.seconds * 1000).toLocaleString()
              : "N/A",
          };
        });

        // Sort newest first
        reqData.sort((a, b) => {
          if (!a.timestampObj || !b.timestampObj) return 0;
          return b.timestampObj.seconds - a.timestampObj.seconds;
        });

        setAcceptedRequests(reqData);
      });
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // FILTERING
  const filteredRequests = acceptedRequests
    .filter((req) => {
      if (!startDate && !endDate) return true;
      if (!req.timestampObj) return false;

      const reqDate = new Date(req.timestampObj.seconds * 1000);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && reqDate < start) return false;
      if (end && reqDate > end) return false;

      return true;
    })
    .filter((req) =>
      vehicleFilter === "All" ? true : req.vehicle === vehicleFilter
    );

  // Vehicle dropdown options auto-build
  const vehicleOptions = [
    "All",
    ...new Set(acceptedRequests.map((req) => req.vehicle || "Unknown")),
  ];

  // FIXED ASSIGN FUNCTION (IMPORTANT)
  const handleAssign = async (id, vehicleType) => {
    const confirmAssign = window.confirm(
      "Do you want to mark this vehicle as assigned?"
    );
    if (!confirmAssign) return;

    const requestRef = doc(db, "emergencyRequests", id);

    await updateDoc(requestRef, {
      assignedVehicle: "Assigned",
      assignedVehicleType: vehicleType, // 🔥 FIX: Send correct type to AssignedVehicles page
    });

    alert("Vehicle marked as assigned!");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginLeft: 220,
        padding: "20px",
        background: "#f4f6f9",
        minHeight: "100vh",
      }}
    >
      <AdminNavbar />

      <h1 style={{ marginBottom: "10px", fontSize: "26px", fontWeight: "700" }}>
        🚑 Accepted Emergency Requests
      </h1>

      <p style={{ color: "#666", marginBottom: "20px" }}>
        Track all accepted requests with automatic sorting & filtering.
      </p>

      {/* FILTERS */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {/* DATE FILTER */}
        <div
          style={{
            background: "white",
            padding: "15px",
            borderRadius: "10px",
            boxShadow: "0 0 10px rgba(0,0,0,0.08)",
            flex: "1",
            minWidth: "280px",
          }}
        >
          <h3 style={{ marginBottom: "10px" }}>📅 Filter by Date</h3>

          <label>From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />

          <label style={{ marginTop: "10px" }}>To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* VEHICLE FILTER */}
        <div
          style={{
            background: "white",
            padding: "15px",
            borderRadius: "10px",
            boxShadow: "0 0 10px rgba(0,0,0,0.08)",
            flex: "1",
            minWidth: "280px",
          }}
        >
          <h3 style={{ marginBottom: "10px" }}>🚓 Filter by Vehicle</h3>

          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            style={{ ...inputStyle, padding: "10px", fontSize: "16px" }}
          >
            {vehicleOptions.map((v, i) => (
              <option key={i}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* REQUEST TABLE */}
      {filteredRequests.length === 0 ? (
        <p style={{ fontSize: "18px", color: "gray" }}>No accepted requests.</p>
      ) : (
        <div
          style={{
            background: "white",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 0 10px rgba(0,0,0,0.08)",
            overflowX: "auto",
          }}
        >
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: "#007BFF", color: "white" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Vehicle</th>
                <th style={thStyle}>Latitude</th>
                <th style={thStyle}>Longitude</th>
                <th style={thStyle}>Date & Time</th>
                <th style={thStyle}>Map</th>
                <th style={thStyle}>Assigned</th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id} style={rowStyle}>
                  <td style={tdStyle}>{req.name}</td>
                  <td style={tdStyle}>{req.phone}</td>
                  <td style={tdStyle}>{req.vehicle}</td>
                  <td style={tdStyle}>{req.latitude}</td>
                  <td style={tdStyle}>{req.longitude}</td>
                  <td style={tdStyle}>{req.dateTime}</td>

                  <td style={tdStyle}>
                    <a
                      href={`https://www.google.com/maps?q=${req.latitude},${req.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#007BFF", fontWeight: "bold" }}
                    >
                      🌍 Map
                    </a>
                  </td>

                  <td style={tdStyle}>
                    {req.assignedVehicle === "Assigned" ? (
                      <span style={{ color: "green", fontSize: "22px" }}>✔</span>
                    ) : (
                      <button
                        onClick={() => handleAssign(req.id, req.vehicle)}
                        style={assignBtnStyle}
                      >
                        Assign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Styles
const inputStyle = {
  width: "100%",
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  marginTop: "5px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  padding: "12px",
  textAlign: "left",
  borderBottom: "2px solid #ddd",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #eee",
};

const rowStyle = {
  transition: "0.2s",
};

const assignBtnStyle = {
  background: "#dc3545",
  color: "white",
  padding: "6px 14px",
  borderRadius: "6px",
  cursor: "pointer",
  border: "none",
  fontWeight: "600",
};

export default AcceptedRequests;

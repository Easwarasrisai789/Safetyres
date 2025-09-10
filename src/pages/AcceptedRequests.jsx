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
        const reqData = snapshot.docs.map((doc) => {
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
        setAcceptedRequests(reqData);
      });
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filtering logic
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

  const vehicleOptions = [
    "All",
    ...new Set(acceptedRequests.map((req) => req.vehicle || "Unknown")),
  ];

  // Assign handler
  const handleAssign = async (id) => {
    const confirmAssign = window.confirm(
      "Are you sure you want to assign this vehicle?"
    );
    if (!confirmAssign) return;

    const requestRef = doc(db, "emergencyRequests", id);
    await updateDoc(requestRef, {
      assignedVehicle: "Assigned",
    });

    alert("Vehicle assigned successfully!");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", marginLeft: 220 }}>
      <AdminNavbar />
      <div style={{ padding: "20px" }}>
        <h2>Accepted Requests</h2>

        {/* Date Filter */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontWeight: "bold", marginRight: "5px" }}>
            Start Date:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ marginRight: "15px" }}
          />
          <label style={{ fontWeight: "bold", marginRight: "5px" }}>
            End Date:
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Vehicle Filter */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>
            Filter by Vehicle:
          </label>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          >
            {vehicleOptions.map((v, index) => (
              <option key={index} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {filteredRequests.length === 0 ? (
          <p>No accepted requests found.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #ddd",
              backgroundColor: "#f9f9f9",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#007BFF", color: "white" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Vehicle</th>
                <th style={thStyle}>Latitude</th>
                <th style={thStyle}>Longitude</th>
                <th style={thStyle}>Date & Time</th>
                <th style={thStyle}>Map</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td style={tdStyle}>{req.name}</td>
                  <td style={tdStyle}>{req.phone}</td>
                  <td style={tdStyle}>{req.vehicle || "N/A"}</td>
                  <td style={tdStyle}>{req.latitude}</td>
                  <td style={tdStyle}>{req.longitude}</td>
                  <td style={tdStyle}>{req.dateTime}</td>
                  <td style={tdStyle}>
                    <a
                      href={`https://www.google.com/maps?q=${req.latitude},${req.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#007BFF", textDecoration: "none" }}
                    >
                      View Map
                    </a>
                  </td>
                  <td style={tdStyle}>
                    {req.assignedVehicle === "Assigned" ? (
                      <span style={{ color: "green", fontSize: "20px" }}>✅</span>
                    ) : (
                      <button
                        onClick={() => handleAssign(req.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "20px",
                          color: "red",
                        }}
                      >
                        ❌
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Styles
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

export default AcceptedRequests;

import React, { useState, useEffect } from "react";
import { db, authReady } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar";

const RequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  // Copy Location
  const handleCopy = (req) => {
    if (req.latitude && req.longitude) {
      const mapsLink = `https://www.google.com/maps?q=${req.latitude},${req.longitude}`;
      const message = `Emergency Location: ${mapsLink}\nContact: ${req.phone}`;
      navigator.clipboard.writeText(message).then(() => {
        alert("Location & phone copied to clipboard!");
      });
    } else {
      alert("No location data available.");
    }
  };

  // Share Location
  const handleShare = (req) => {
    if (req.latitude && req.longitude) {
      const osmLink = `https://www.openstreetmap.org/?mlat=${req.latitude}&mlon=${req.longitude}#map=18/${req.latitude}/${req.longitude}`;
      window.open(osmLink, "_blank");
    } else {
      alert("Location not available.");
    }
  };

  // Auto Status Update (with auto vehicle assignment)
  const handleStatusUpdate = async (reqId, newStatus) => {
    try {
      const reqDoc = doc(db, "emergencyRequests", reqId);

      let extraUpdate = {};
      if (newStatus === "Accepted") {
        const current = requests.find((r) => r.id === reqId);
        const typeSrc = (current?.situation || current?.vehicle || "").toLowerCase();

        let vehicleType = "ambulance";
        if (typeSrc.includes("fire")) vehicleType = "fireengine";
        else if (typeSrc.includes("police") || typeSrc.includes("crime")) vehicleType = "policevan";

        const poolSize = 10;
        const slot = ((Date.now() / 60000) | 0) % poolSize;

        const assignedVehicle =
          vehicleType === "ambulance"
            ? `Ambulance-${slot + 1}`
            : vehicleType === "fireengine"
            ? `FireEngine-${slot + 1}`
            : `PoliceVan-${slot + 1}`;

        extraUpdate = {
          assignedVehicle,
          assignedVehicleType: vehicleType,
          vehicleAssignedAt: serverTimestamp(),
        };
      }

      await updateDoc(reqDoc, { status: newStatus, ...extraUpdate });

      setRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
      );
    } catch (error) {
      console.error("Failed:", error);
    }
  };

  // AUTO ACCEPT LOGIC (MAIN PART)
  useEffect(() => {
    let unsubscribe = null;
    let active = true;

    authReady.then(() => {
      if (!active) return;

      unsubscribe = onSnapshot(
        collection(db, "emergencyRequests"),
        async (snapshot) => {
          const allReq = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "",
              phone: data.phone || "",
              situation: data.situation || data.vehicle || "",
              latitude: data.latitude || data.location?.latitude || null,
              longitude: data.longitude || data.location?.longitude || null,
              status: data.status || "Pending",
              timestamp: data.timestamp ? data.timestamp.toDate() : null,
            };
          });

          // Auto accept any new pending request
          for (const req of allReq) {
            if (req.status === "Pending") {
              await handleStatusUpdate(req.id, "Accepted");
            }
          }

          // Show only last 1 hour
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const fresh = allReq.filter((r) => r.timestamp && r.timestamp >= oneHourAgo);

          setRequests(fresh);
        }
      );
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", marginLeft: 220, background: "#f4f6f9", minHeight: "100vh" }}>
      <AdminNavbar />

      <div style={{ padding: "20px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "10px" }}>
          🚨 Emergency Requests (Auto-Accept Enabled)
        </h1>
        <p style={{ color: "#666", marginBottom: "20px" }}>
          All incoming requests are automatically accepted & assigned.
        </p>

        {/* Requests */}
        {requests.length === 0 ? (
          <p style={{ fontSize: "18px", color: "gray" }}>No recent requests.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: "20px",
            }}
          >
            {requests.map((req) => (
              <div
                key={req.id}
                onClick={() => setSelected(req)}
                style={{
                  borderRadius: "12px",
                  background: "#fff",
                  padding: "20px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                  transition: "0.2s",
                  border: selected?.id === req.id ? "2px solid #007bff" : "2px solid transparent",
                }}
              >
                <h3>{req.name}</h3>
                <p><b>Phone:</b> {req.phone}</p>
                <p><b>Situation:</b> {req.situation}</p>
                <p><b>Time:</b> {req.timestamp?.toLocaleString()}</p>

                {/* Status Badge */}
                <div
                  style={{
                    marginTop: "10px",
                    padding: "5px 12px",
                    borderRadius: "20px",
                    color: "white",
                    background: "#28a745",
                    display: "inline-block",
                    fontWeight: "600",
                  }}
                >
                  Accepted
                </div>

                {/* Buttons */}
                <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(req); }}
                    style={buttonStyle("#007bff")}
                  >
                    Copy
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleShare(req); }}
                    style={buttonStyle("#17a2b8")}
                  >
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map Panel */}
      <div style={{ height: "400px", marginTop: "30px", padding: "20px" }}>
        {selected?.latitude && selected?.longitude ? (
          <iframe
            title="OpenStreetMap"
            width="100%"
            height="100%"
            style={{ border: 0, borderRadius: "10px" }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${selected.longitude - 0.01},${selected.latitude - 0.01},${selected.longitude + 0.01},${selected.latitude + 0.01}&layer=mapnik&marker=${selected.latitude},${selected.longitude}`}
          ></iframe>
        ) : (
          <p style={{ color: "gray" }}>Select a request to view location.</p>
        )}
      </div>
    </div>
  );
};

// Button Styling
const buttonStyle = (color) => ({
  padding: "8px 14px",
  background: color,
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
  transition: "0.2s",
});

export default RequestsPage;

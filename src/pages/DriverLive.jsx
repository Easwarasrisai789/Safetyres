import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import DriverMap from "./DriverMap";
import AdminNavbar from "../components/AdminNavbar";

export default function DriverLive() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const driverId = params.get("driverId");

  const [driver, setDriver] = useState(null);
  const [tick, setTick] = useState(0);

  /* ---------------------- REALTIME DRIVER LISTENER ---------------------- */
  useEffect(() => {
    if (!driverId) return;

    const unsub = onSnapshot(doc(db, "drivers", driverId), (snap) => {
      if (snap.exists()) {
        setDriver(snap.data());
      }
    });

    return () => unsub();
  }, [driverId]);

  /* ---------------------- AUTO TIMER ---------------------- */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const lastUpdatedSec = useMemo(() => {
    if (!driver?.lastSharedAt) return null;
    return Math.floor((Date.now() - new Date(driver.lastSharedAt).getTime()) / 1000);
  }, [driver?.lastSharedAt, tick]);

  /* ---------------------- UI ---------------------- */
  return (
    <div style={{ display: "flex", background: "#eef2f6", minHeight: "100vh" }}>
      {/* LEFT FIXED NAVBAR */}
      <AdminNavbar />

      {/* CONTENT AREA */}
      <div style={styles.container}>
        <div style={styles.card}>
          {!driver ? (
            <h2>Loading driver...</h2>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>
                Live Tracking –{" "}
                <span style={{ color: "#1f7a8c", fontWeight: "700" }}>
                  {driver.name}
                </span>
              </h2>

              {/* Status Row */}
              <div style={styles.statusRow}>
                <div>
                  <b>Vehicle Type:</b> {driver.vehicleType}
                </div>
                <div>
                  <b>Duty:</b>{" "}
                  <span
                    style={{
                      color: driver.status === "active" ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    {driver.status === "active" ? "🟢 On Duty" : "🔴 Offline"}
                  </span>
                </div>
                <div>
                  <b>Live Sharing:</b>{" "}
                  <span
                    style={{
                      color: driver.liveShare ? "#2563eb" : "#991b1b",
                      fontWeight: "bold",
                    }}
                  >
                    {driver.liveShare ? "🟦 Enabled" : "❌ Disabled"}
                  </span>
                </div>
              </div>

              {/* Last updated */}
              {lastUpdatedSec !== null && (
                <p
                  style={{
                    marginTop: 6,
                    marginBottom: 12,
                    color: lastUpdatedSec < 40 ? "#16a34a" : "#dc2626",
                    fontWeight: 600,
                  }}
                >
                  🔄 Last Updated: {lastUpdatedSec} sec ago
                </p>
              )}

              {/* MAP */}
              <div style={styles.mapBox}>
                {driver.location ? (
                  <DriverMap
                    driverLocation={driver.location}
                    destination={null}
                  />
                ) : (
                  <p style={{ textAlign: "center", padding: 20 }}>
                    Driver has not shared location yet.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------- STYLES ---------------------- */

const styles = {
  container: {
    marginLeft: 220, // ⭐ navbar width
    padding: 20,
    width: "100%",
  },
  card: {
    width: "95%",
    maxWidth: 900,
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0px 4px 16px rgba(0,0,0,0.1)",
    margin: "auto",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    fontSize: 16,
  },
  mapBox: {
    width: "100%",
    height: 450,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #ccc",
    marginTop: 10,
  },
};

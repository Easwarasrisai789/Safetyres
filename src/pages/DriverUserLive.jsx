import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import DriverMap from "./DriverMap"; // same map component


export default function DriverUserLive() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const requestId = params.get("requestId");
  const driverId = params.get("driverId");

  const [driver, setDriver] = useState(null);
  const [request, setRequest] = useState(null);
  const [tick, setTick] = useState(0);

  /* -----------------------------------------
          REALTIME DRIVER LOCATION
  ------------------------------------------ */
  useEffect(() => {
    if (!driverId) return;

    const unsub = onSnapshot(doc(db, "drivers", driverId), (snap) => {
      if (snap.exists()) setDriver(snap.data());
    });

    return () => unsub();
  }, [driverId]);


  /* -----------------------------------------
          REALTIME USER (REQUESTER) LOCATION
  ------------------------------------------ */
  useEffect(() => {
    if (!requestId) return;

    const unsub = onSnapshot(doc(db, "emergencyRequests", requestId), (snap) => {
      if (snap.exists()) setRequest(snap.data());
    });

    return () => unsub();
  }, [requestId]);


  /* -----------------------------------------
          LAST UPDATED TIMER
  ------------------------------------------ */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const lastUpdatedSec = useMemo(() => {
    if (!driver?.lastSharedAt) return null;
    return Math.floor((Date.now() - new Date(driver.lastSharedAt).getTime()) / 1000);
  }, [driver?.lastSharedAt, tick]);

  /* -----------------------------------------
                     UI
  ------------------------------------------ */
  return (
    <div style={{ display: "flex" }}>
      <DriverNavbar />

      <div style={styles.container}>
        <div style={styles.card}>
          {!driver || !request ? (
            <h2>Loading live tracking...</h2>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>
                Tracking User Location for{" "}
                <span style={{ color: "#1f7a8c", fontWeight: "700" }}>
                  {request.name}
                </span>
              </h2>

              {/* Status Summary */}
              <div style={styles.statusRow}>
                <div>
                  <b>Emergency Type:</b> {request.emergencyType}
                </div>
                <div>
                  <b>Driver:</b> {driver.name}
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
                  🔄 Driver Location Updated {lastUpdatedSec} seconds ago
                </p>
              )}

              {/* MAP */}
              <div style={styles.mapBox}>
                {driver.location && request.location ? (
                  <DriverMap
                    driverLocation={driver.location}
                    destination={request.location}
                  />
                ) : (
                  <p style={{ textAlign: "center", padding: 20 }}>
                    Waiting for both live locations…
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

/* -----------------------------------------
                 STYLES
------------------------------------------ */

const styles = {
  container: {
    padding: 30,
    background: "#eef2f6",
    minHeight: "100vh",
    width: "100%",
    marginLeft: 220,
  },
  card: {
    width: "100%",
    maxWidth: 1000,
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0px 4px 16px rgba(0,0,0,0.1)",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    fontSize: 16,
  },
  mapBox: {
    width: "100%",
    height: 480,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #ccc",
    marginTop: 10,
  },
};

// src/pages/DriverPortal.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  updatePassword as fbUpdatePassword,
} from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";

import DriverMap from "./DriverMap";

/**
 * DriverPortal.jsx
 *
 * Full page code. Added:
 * - Online / Offline toggle visible in the sidebar (driver only).
 * - Robust guarding around driverDocId before updates.
 * - LiveShare handling and auto location updates (every 30s when enabled).
 * - Clear notifications and auto-dismiss behavior.
 *
 * NOTE: This page is meant to be the driver's portal (driver authenticates).
 * Admin-only controls should not be here; admin will have separate pages.
 */

export default function DriverPortal() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [driverDocId, setDriverDocId] = useState(null);
  const [allAssignments, setAllAssignments] = useState([]);

  const [activeTab, setActiveTab] = useState("assignment");

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    vehicleType: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    next: "",
    confirm: "",
  });

  const [notification, setNotification] = useState(null);
  const [tick, setTick] = useState(0);

  const [mapModal, setMapModal] = useState({
    open: false,
    destination: null,
  });

  const navigate = useNavigate();
  const router = useLocation();
  const searchParams = new URLSearchParams(router.search);
  const impersonateDriverId = searchParams.get("impersonate");

  /* ----------------------- AUTH LISTENER ----------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  /* -------------------- DRIVER SNAPSHOT LISTENER -------------------- */
  useEffect(() => {
    let unsubDriver = null;
    let unsubRequests = null;

    if (!user && !impersonateDriverId) return;

    const dq = impersonateDriverId
      ? query(
          collection(db, "drivers"),
          where("__name__", "==", impersonateDriverId)
        )
      : query(
          collection(db, "drivers"),
          where("email", "==", user?.email ?? "")
        );

    unsubDriver = onSnapshot(
      dq,
      (snap) => {
        if (snap.empty) {
          // no driver document yet
          console.warn("No driver doc found for this account/query");
          setDriver(null);
          setDriverDocId(null);
          setAllAssignments([]);
          return;
        }

        const ref = snap.docs[0];
        const data = ref.data();

        setDriver({
          ...data,
          status: data?.status ?? "active",
          liveShare: data?.liveShare ?? false,
        });

        setDriverDocId(ref.id);

        setProfileForm({
          name: data?.name ?? "",
          phone: data?.phone ?? "",
          vehicleType: data?.vehicleType ?? "",
        });

        // subscribe to assignments for this driver document id
        if (unsubRequests) {
          try {
            unsubRequests();
          } catch (e) {}
          unsubRequests = null;
        }

        const rq = query(
          collection(db, "emergencyRequests"),
          where("assignedDriverId", "==", ref.id)
        );

        unsubRequests = onSnapshot(rq, (ss) => {
          setAllAssignments(ss.docs.map((x) => ({ id: x.id, ...x.data() })));
        });
      },
      (err) => {
        console.error("driver onSnapshot error", err);
      }
    );

    return () => {
      try {
        if (unsubDriver) unsubDriver();
      } catch (e) {}
      try {
        if (unsubRequests) unsubRequests();
      } catch (e) {}
    };
  }, [user, impersonateDriverId]);

  /* ---------------------- ASSIGNMENT FILTERING ---------------------- */
  const { currentAssignment, historyAssignments } = useMemo(() => {
    const now = Date.now();
    let current = null;
    const history = [];

    for (const r of allAssignments) {
      const assignedMs = r.vehicleAssignedAt?.seconds
        ? r.vehicleAssignedAt.seconds * 1000
        : r.vehicleAssignedAt
        ? Date.parse(r.vehicleAssignedAt)
        : null;

      const active = assignedMs ? now - assignedMs < 10 * 60 * 1000 : false;

      if (r.status === "assigned" && active && !current) current = r;
      else history.push(r);
    }

    history.sort(
      (a, b) =>
        (b.vehicleAssignedAt?.seconds ?? 0) - (a.vehicleAssignedAt?.seconds ?? 0)
    );

    return { currentAssignment: current, historyAssignments: history };
  }, [allAssignments]);

  /* ---------------------- MANUAL SHARE LOCATION ---------------------- */
  const shareLocation = () => {
    if (!navigator.geolocation) {
      setNotification({ title: "Error", message: "GPS not supported", type: "error" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!driverDocId) {
          setNotification({ title: "Error", message: "Driver record not loaded yet.", type: "error" });
          return;
        }

        const { latitude, longitude } = pos.coords;

        try {
          await updateDoc(doc(db, "drivers", driverDocId), {
            location: { latitude, longitude },
            lastSharedAt: new Date().toISOString(),
          });

          setNotification({ title: "Success", message: "Location shared", type: "success" });
        } catch (err) {
          console.error("shareLocation update error", err);
          setNotification({ title: "Error", message: "Failed to share location", type: "error" });
        }
      },
      (err) => {
        console.error("geolocation error", err);
        setNotification({ title: "Error", message: "Location permission denied or unavailable", type: "error" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* ---------------------- AUTO LOCATION UPDATE (LIVE SHARE) ---------------------- */
  useEffect(() => {
    if (!driverDocId) return;

    let stopped = false;

    const updater = () => {
      if (stopped) return;
      // only when liveShare enabled and driver is active
      if (!driver?.liveShare) return;
      if (driver?.status !== "active") return;

      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (stopped) return;
          if (!driverDocId) return;
          const { latitude, longitude } = pos.coords;
          try {
            await updateDoc(doc(db, "drivers", driverDocId), {
              location: { latitude, longitude },
              lastSharedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error("auto update location error:", err);
          }
        },
        (err) => {
          // silent
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // run immediately and then every 30s
    updater();
    const interval = setInterval(updater, 30000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [driverDocId, driver?.liveShare, driver?.status]);

  /* ------------------ LAST LOCATION UPDATE TIMER ------------------ */
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const lastUpdatedSeconds = useMemo(() => {
    if (!driver?.lastSharedAt) return null;
    const ms = new Date(driver.lastSharedAt).getTime();
    if (Number.isNaN(ms)) return null;
    return Math.floor((Date.now() - ms) / 1000);
  }, [driver?.lastSharedAt, tick]);

  /* -------------------------- SAVE PROFILE -------------------------- */
  const saveProfile = async () => {
    if (!driverDocId) {
      setNotification({ title: "Error", message: "Driver record not loaded yet.", type: "error" });
      return;
    }

    try {
      await updateDoc(doc(db, "drivers", driverDocId), {
        name: profileForm.name,
        phone: profileForm.phone,
        vehicleType: profileForm.vehicleType,
      });

      setNotification({ title: "Success", message: "Profile updated", type: "success" });
    } catch (err) {
      console.error("saveProfile error", err);
      setNotification({ title: "Error", message: "Failed to save profile", type: "error" });
    }
  };

  /* ------------------------ CHANGE PASSWORD ------------------------ */
  const changePassword = async () => {
    if (passwordForm.next !== passwordForm.confirm) {
      setNotification({ title: "Error", message: "Passwords do not match", type: "error" });
      return;
    }

    try {
      await fbUpdatePassword(auth.currentUser, passwordForm.next);
      setPasswordForm({ next: "", confirm: "" });
      setNotification({ title: "Success", message: "Password updated", type: "success" });
    } catch (e) {
      console.error("changePassword error", e);
      setNotification({ title: "Error", message: "Re-login required", type: "error" });
    }
  };

  /* ---------------------------- LOGOUT ---------------------------- */
  const doLogout = async () => {
    await signOut(auth);
    navigate("/driver-login");
  };

  /* ---------------------------- MAP MODAL ---------------------------- */
  const openMapModal = (lat, lng) => {
    setMapModal({
      open: true,
      destination: { latitude: lat, longitude: lng },
    });
  };
  const closeMapModal = () => setMapModal({ open: false, destination: null });

  /* ---------------------------- NOTIFICATIONS AUTO CLOSE ---------------------------- */
  useEffect(() => {
    if (!notification) return;
    const id = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(id);
  }, [notification]);

  /* ---------------------------- STATUS TOGGLE (SIDEBAR) ---------------------------- */
  const setDutyStatus = async (newStatus) => {
    if (!driverDocId) {
      setNotification({ title: "Error", message: "Driver record not loaded yet.", type: "error" });
      return;
    }
    try {
      await updateDoc(doc(db, "drivers", driverDocId), { status: newStatus });
      setDriver((p) => ({ ...(p || {}), status: newStatus }));
      setNotification({ title: "Status Updated", message: `You are now ${newStatus}`, type: "success" });
    } catch (err) {
      console.error("status update error", err);
      setNotification({ title: "Error", message: "Failed to update status", type: "error" });
    }
  };

  /* ---------------------------- UI ---------------------------- */
  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <h3 style={{ margin: 0 }}>{driver?.name || "Driver Portal"}</h3>
        <div style={{ color: "#ddd", fontSize: 13, marginTop: 6 }}>{driver?.email}</div>

        {/* Duty toggle in sidebar for quick access */}
        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontWeight: "600", fontSize: 13 }}>Duty:</div>
          <select
            value={driver?.status ?? "active"}
            onChange={(e) => setDutyStatus(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: driver?.status === "active" ? "#e6ffef" : "#fff0f0",
              color: driver?.status === "active" ? "#065f46" : "#991b1b",
              fontWeight: 700,
            }}
          >
            <option value="active">🟢 On Duty</option>
            <option value="offline">🔴 Offline</option>
          </select>
        </div>

        <ul style={styles.menu}>
          <li
            style={{
              ...styles.menuItem,
              ...(activeTab === "assignment" && styles.menuItemActive),
            }}
            onClick={() => setActiveTab("assignment")}
          >
            My Assignment
          </li>

          <li
            style={{
              ...styles.menuItem,
              ...(activeTab === "profile" && styles.menuItemActive),
            }}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </li>

          <li
            style={{
              ...styles.menuItem,
              ...(activeTab === "history" && styles.menuItemActive),
            }}
            onClick={() => setActiveTab("history")}
          >
            History
          </li>
        </ul>

        <button style={styles.logout} onClick={doLogout}>
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        <h2>Welcome {driver?.name}</h2>

        {/* ========== ASSIGNMENT TAB ========== */}
        {activeTab === "assignment" && (
          <div style={styles.card}>
            <h3>Current Assignment</h3>

            {/* LIVE SHARE */}
            <div style={{ margin: "10px 0 16px 0" }}>
              <label style={{ fontWeight: "bold" }}>Live Share:</label>

              <select
                value={driver?.liveShare ? "on" : "off"}
                style={{ marginLeft: 10, padding: "8px 12px", borderRadius: 6 }}
                onChange={async (e) => {
                  const val = e.target.value === "on";
                  if (!driverDocId) {
                    setNotification({ title: "Error", message: "Driver record not loaded yet.", type: "error" });
                    return;
                  }
                  try {
                    await updateDoc(doc(db, "drivers", driverDocId), { liveShare: val });
                    setDriver((p) => ({ ...(p || {}), liveShare: val }));
                    setNotification({ title: "Live Share", message: val ? "Enabled" : "Disabled", type: "success" });
                  } catch (err) {
                    console.error("liveShare update error", err);
                    setNotification({ title: "Error", message: "Failed to update live share", type: "error" });
                  }
                }}
              >
                <option value="on">🟢 ON</option>
                <option value="off">🔴 OFF</option>
              </select>
            </div>

            {/* No Assignment */}
            {!currentAssignment && <p>No Active Assignment</p>}

            {/* With Assignment */}
            {currentAssignment && (
              <div style={styles.assignmentGrid}>
                <div>
                  <p><b>Vehicle:</b> {currentAssignment.assignedVehicle}</p>
                  <p><b>Type:</b> {currentAssignment.assignedVehicleType}</p>
                  <p><b>Status:</b> {currentAssignment.status}</p>
                </div>

                <div>
                  <p><b>Destination:</b> {currentAssignment.latitude}, {currentAssignment.longitude}</p>

                  <div style={styles.mapBox}>
                    <DriverMap
                      driverLocation={driver?.location}
                      destination={{
                        latitude: currentAssignment.latitude,
                        longitude: currentAssignment.longitude,
                      }}
                    />
                  </div>

                  {lastUpdatedSeconds !== null && (
                    <p style={{ marginTop: 10, color: lastUpdatedSeconds < 40 ? "green" : "red" }}>
                      🔄 Last Updated: {lastUpdatedSeconds}s ago
                    </p>
                  )}

                  <button
                    style={styles.button}
                    onClick={() => openMapModal(currentAssignment.latitude, currentAssignment.longitude)}
                  >
                    Expand Map
                  </button>

                  <button
                    style={{ ...styles.button, background: "#2D9CDB", marginLeft: 10 }}
                    onClick={shareLocation}
                  >
                    Share Location
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== PROFILE TAB ========== */}
        {activeTab === "profile" && (
          <div style={styles.card}>
            <h3>Profile</h3>

            <div style={styles.formGrid}>
              <div>
                <label>Name</label>
                <input
                  style={styles.input}
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </div>

              <div>
                <label>Phone</label>
                <input
                  style={styles.input}
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label>Vehicle Type</label>
                <select
                  style={styles.input}
                  value={profileForm.vehicleType}
                  onChange={(e) => setProfileForm({ ...profileForm, vehicleType: e.target.value })}
                >
                  <option value="ambulance">Ambulance</option>
                  <option value="fireengine">Fire Engine</option>
                  <option value="policevan">Police Van</option>
                </select>
              </div>
            </div>

            <button style={styles.button} onClick={saveProfile}>Save Profile</button>

            <hr style={{ margin: "20px 0" }} />

            <h3>Change Password</h3>

            <div style={styles.formGrid}>
              <div>
                <label>New Password</label>
                <input
                  type="password"
                  style={styles.input}
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                />
              </div>

              <div>
                <label>Confirm Password</label>
                <input
                  type="password"
                  style={styles.input}
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                />
              </div>
            </div>

            <button style={styles.button} onClick={changePassword}>Update Password</button>
          </div>
        )}

        {/* ========== HISTORY TAB ========== */}
        {activeTab === "history" && (
          <div style={styles.card}>
            <h3>Past Assignments</h3>

            {historyAssignments.length === 0 && <p>No History Found</p>}

            {historyAssignments.length > 0 && (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Vehicle</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Assigned At</th>
                    <th style={styles.th}>Location</th>
                    <th style={styles.th}>Map</th>
                  </tr>
                </thead>

                <tbody>
                  {historyAssignments.map((r) => (
                    <tr key={r.id}>
                      <td style={styles.td}>{r.assignedVehicle}</td>
                      <td style={styles.td}>{r.assignedVehicleType}</td>
                      <td style={styles.td}>
                        {r.vehicleAssignedAt?.seconds ? new Date(r.vehicleAssignedAt.seconds * 1000).toLocaleString() : "-"}
                      </td>
                      <td style={styles.td}>{r.latitude}, {r.longitude}</td>
                      <td style={styles.td}>
                        <button style={styles.smallButton} onClick={() => openMapModal(r.latitude, r.longitude)}>Open Map</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* -------- TOAST -------- */}
        {notification && (
          <div style={styles.toast}>
            <b>{notification.title}</b>
            <div>{notification.message}</div>
          </div>
        )}

        {/* -------- MAP MODAL -------- */}
        {mapModal.open && (
          <div style={styles.modalOverlay} onClick={closeMapModal}>
            <div style={styles.modalBody} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3>Map View</h3>
                <button style={styles.button} onClick={closeMapModal}>Close</button>
              </div>

              <div style={{ height: 450 }}>
                <DriverMap driverLocation={driver?.location} destination={mapModal.destination} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ====================== PAGE STYLES ====================== */
const styles = {
  container: {
    display: "flex",
    background: "#F5F6FA",
    minHeight: "100vh",
  },

  sidebar: {
    width: 220,
    background: "linear-gradient(180deg,#1B2B3A,#26343F)",
    color: "#fff",
    padding: 20,
    display: "flex",
    flexDirection: "column",
  },

  menu: {
    listStyle: "none",
    padding: 0,
    marginTop: 20,
  },

  menuItem: {
    padding: "10px 6px",
    cursor: "pointer",
    color: "#BFD5E3",
    borderRadius: 6,
  },

  menuItemActive: {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    fontWeight: "bold",
  },

  logout: {
    marginTop: "auto",
    padding: "10px 14px",
    borderRadius: 8,
    background: "#D9534F",
    border: "none",
    color: "#fff",
    cursor: "pointer",
  },

  main: {
    flex: 1,
    padding: 30,
  },

  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },

  assignmentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },

  mapBox: {
    border: "1px solid #ddd",
    height: 220,
    borderRadius: 10,
    overflow: "hidden",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: 15,
  },

  input: {
    padding: 10,
    width: "100%",
    borderRadius: 8,
    border: "1px solid #ccc",
  },

  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: 10,
    background: "#F1F3F5",
    borderBottom: "2px solid #ddd",
  },
  td: {
    padding: 10,
    borderBottom: "1px solid #eee",
  },

  button: {
    background: "#1F7A8C",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },

  smallButton: {
    background: "#1F7A8C",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },

  toast: {
    position: "fixed",
    bottom: 20,
    right: 20,
    padding: 16,
    background: "#111827",
    color: "#fff",
    borderRadius: 10,
    zIndex: 3000,
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },

  modalBody: {
    width: "90%",
    maxWidth: 700,
    background: "#fff",
    padding: 20,
    borderRadius: 12,
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 15,
  },
};

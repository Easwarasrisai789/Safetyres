import React, { useEffect, useState } from "react";
import { db, authReady, createDriverAccount } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc } from "firebase/firestore";
import AdminNavbar from "../components/AdminNavbar";

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleType: "ambulance",
    password: "",
  });

  const [prefillEmail, setPrefillEmail] = useState(false);

  /* ------------------------------------------------
      REALTIME DRIVER LISTENER
  --------------------------------------------------- */
  useEffect(() => {
    let unsubscribe = null;
    let active = true;

    authReady.then(() => {
      if (!active) return;

      unsubscribe = onSnapshot(collection(db, "drivers"), (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDrivers(rows);
      });
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  /* ------------------------------------------------
        ADMIN CAN CHANGE AVAILABILITY ONLY
  --------------------------------------------------- */
  const setAvailability = async (driverId, available) => {
    await updateDoc(doc(db, "drivers", driverId), { available });
  };

  /* ------------------------------------------------
          DRIVER CODE GENERATOR
  --------------------------------------------------- */
  const getDriverCode = (driver, all) => {
    const type = (driver.vehicleType || "").toLowerCase();
    const group = all.filter((d) => (d.vehicleType || "").toLowerCase() === type);
    const index = group.findIndex((d) => d.id === driver.id);

    if (type === "ambulance") return `AMD${index + 1}`;
    if (type === "policevan") return `POD${index + 1}`;
    if (type === "fireengine") return `FIR${index + 1}`;
    return `DRV${index + 1}`;
  };

  /* ------------------------------------------------
                REGISTER DRIVER
  --------------------------------------------------- */
  const onSubmit = async (e) => {
    e.preventDefault();

    let uid = null;
    try {
      uid = await createDriverAccount(form.email, form.password);
    } catch (err) {
      alert("Failed to create user: " + (err?.message || ""));
      return;
    }

    await addDoc(collection(db, "drivers"), {
      uid,
      name: form.name,
      email: form.email,
      phone: form.phone,
      vehicleType: form.vehicleType,
      available: true,
      status: "active",
      assignedVehicle: null,
      location: null,
      createdAt: new Date().toISOString(),
    });

    setForm({
      name: "",
      email: "",
      phone: "",
      vehicleType: "ambulance",
      password: "",
    });
  };

  /* ------------------------------------------------
                        UI
  --------------------------------------------------- */

  return (
    <div style={{ display: "flex", flexDirection: "column", background: "#f4f7fb", minHeight: "100vh" }}>
      <AdminNavbar />

      <div style={{ marginLeft: 220, padding: "30px" }}>
        <h1 style={{ marginBottom: 10, fontSize: 28, fontWeight: 700 }}>🚗 Driver Management</h1>

        {/* REGISTER DRIVER */}
        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
          marginBottom: "30px",
        }}>
          <h2 style={{ marginBottom: 15 }}>Register New Driver</h2>

          <form
            onSubmit={onSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            <input placeholder="Driver Name" style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Email" type="email" style={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Phone Number" style={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

            <select style={input} value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
              <option value="ambulance">Ambulance</option>
              <option value="fireengine">Fire Engine</option>
              <option value="policevan">Police Van</option>
            </select>

            <input placeholder="Temporary Password" style={input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="submit" style={addBtn}>Add Driver</button>
          </form>
        </div>

        {/* DRIVER LIST */}
        {drivers.length === 0 ? (
          <p>No drivers found.</p>
        ) : (
          <div style={{
            background: "white",
            borderRadius: 12,
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            padding: 20,
          }}>
            <h2 style={{ marginTop: 0 }}>Driver List</h2>

            <label style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <input type="checkbox" checked={prefillEmail} onChange={() => setPrefillEmail(!prefillEmail)} />
              <span style={{ marginLeft: 8, fontWeight: 600 }}>Enable Prefill Email Option</span>
            </label>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1f7a8c", color: "white" }}>
                  <th style={th}>Code</th>
                  <th style={th}>Name</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Vehicle</th>
                  <th style={th}>Assigned Vehicle</th>
                  <th style={th}>Availability</th>
                  <th style={th}>Duty Status</th>
                  <th style={th}>Track Live</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} style={row}>

                    <td style={td}><b>{getDriverCode(d, drivers)}</b></td>
                    <td style={td}>{d.name}</td>
                    <td style={td}>{d.phone}</td>
                    <td style={td}>{d.vehicleType}</td>
                    <td style={td}>{d.assignedVehicle || "-"}</td>

                    {/* Availability */}
                    <td style={td}>
                      <label style={{ display: "flex", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!d.available}
                          onChange={(e) => setAvailability(d.id, e.target.checked)}
                        />
                        <span style={{ marginLeft: 8, fontWeight: 600, color: d.available ? "green" : "red" }}>
                          {d.available ? "Available" : "Busy"}
                        </span>
                      </label>
                    </td>

                    {/* Duty Status (READ ONLY) */}
                    <td style={td}>
                      <span style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: d.status === "active" ? "#d1fae5" : "#fee2e2",
                        color: d.status === "active" ? "#065f46" : "#991b1b",
                        fontWeight: 600,
                      }}>
                        {d.status === "active" ? "🟢 On Duty" : "🔴 Offline"}
                      </span>
                    </td>

                    {/* TRACK DRIVER BUTTON */}
                    <td style={td}>
                      <a
                        href={`/driver-live?driverId=${d.id}`}
                        style={{
                          background: "#1f7a8c",
                          padding: "6px 12px",
                          borderRadius: 6,
                          color: "white",
                          textDecoration: "none",
                          fontSize: "13px",
                          fontWeight: 600
                        }}
                      >
                        Track Driver
                      </a>
                    </td>

                    {/* ACTIONS */}
                    <td style={td}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {prefillEmail && (
                          <a href={`/driver-login?email=${encodeURIComponent(d.email)}`} style={smallBtnBlue}>
                            Prefill
                          </a>
                        )}
                        <a href={`/driver?impersonate=${d.id}`} style={smallBtnGrey}>
                          Admin View
                        </a>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "14px",
};

const addBtn = {
  background: "#1f7a8c",
  color: "white",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "none",
  fontWeight: "bold",
  cursor: "pointer",
};

const th = {
  padding: "12px",
  textAlign: "left",
  fontSize: "14px",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #eee",
  fontSize: "14px",
};

const row = {
  background: "white",
  transition: "0.2s",
};

const smallBtnBlue = {
  background: "#1f7a8c",
  padding: "6px 10px",
  borderRadius: "6px",
  color: "white",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 600,
};

const smallBtnGrey = {
  background: "#6c757d",
  padding: "6px 10px",
  borderRadius: "6px",
  color: "white",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 600,
};

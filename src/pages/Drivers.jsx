import React, { useEffect, useState } from "react";
import { db, authReady, createDriverAccount } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc } from "firebase/firestore";
import AdminNavbar from "../components/AdminNavbar";

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", vehicleType: "ambulance", password: "" });

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
    return () => { active = false; if (unsubscribe) unsubscribe(); };
  }, []);

  const setAvailability = async (driverId, available) => {
    const ref = doc(db, "drivers", driverId);
    await updateDoc(ref, { available });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // Create auth account first
    let uid = null;
    try {
      uid = await createDriverAccount(form.email, form.password);
    } catch (err) {
      alert('Failed to create auth user: ' + (err?.message || ''));
      return;
    }
    await addDoc(collection(db, 'drivers'), {
      uid,
      name: form.name,
      email: form.email,
      phone: form.phone,
      vehicleType: form.vehicleType,
      available: true,
      assignedVehicle: null,
      createdAt: new Date().toISOString(),
    });
    setForm({ name: "", email: "", phone: "", vehicleType: "ambulance", password: "" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AdminNavbar />
      <div style={{ padding: 20, marginLeft: 220 }}>
        <h2>Drivers</h2>
        <div style={{ margin: '12px 0', background: '#fff', border: '1px solid #eaeaea', borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Register New Driver</h3>
          <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(140px, 1fr))', gap: 10, alignItems: 'center' }}>
            <input style={{ width: '100%' }} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input style={{ width: '100%' }} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input style={{ width: '100%' }} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select style={{ width: '100%' }} value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
              <option value="ambulance">Ambulance</option>
              <option value="fireengine">Fire Engine</option>
              <option value="policevan">Police Van</option>
            </select>
            <input style={{ width: '100%' }} placeholder="Temp Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="submit" style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: '#1f7a8c', color: '#fff', fontWeight: 'bold' }}>Add</button>
          </form>
        </div>
        {drivers.length === 0 ? (
          <p>No drivers found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Phone</th>
                <th style={th}>Vehicle Type</th>
                <th style={th}>Assigned Vehicle</th>
                <th style={th}>Available</th>
                <th style={th}>Last Location</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td style={td}>{d.name || "-"}</td>
                  <td style={td}>{d.phone || "-"}</td>
                  <td style={td}>{d.vehicleType || "-"}</td>
                  <td style={td}>{d.assignedVehicle || "-"}</td>
                  <td style={td}>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!d.available}
                        onChange={(e) => setAvailability(d.id, e.target.checked)}
                      />
                      <span style={{ marginLeft: 8 }}>{d.available ? "Available" : "Busy"}</span>
                    </label>
                  </td>
                  <td style={td}>
                    {d.location?.latitude && d.location?.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${d.location.latitude},${d.location.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Map
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href={`/driver-login?email=${encodeURIComponent(d.email || "")}`}
                        style={{ textDecoration: 'none', background: '#1f7a8c', color: '#fff', padding: '6px 10px', borderRadius: 6 }}
                      >
                        Prefill Email
                      </a>
                      <a
                        href={`/driver?impersonate=${encodeURIComponent(d.id)}`}
                        style={{ textDecoration: 'none', background: '#6c757d', color: '#fff', padding: '6px 10px', borderRadius: 6 }}
                        title="Admin view of driver portal without credentials"
                      >
                        Admin View
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const th = { padding: 10, border: "1px solid #ddd", textAlign: "left" };
const td = { padding: 8, border: "1px solid #ddd" };



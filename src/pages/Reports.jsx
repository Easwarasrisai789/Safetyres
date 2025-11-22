import React, { useEffect, useState } from 'react';
import { db, authReady } from '../firebase';
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import AdminNavbar from '../components/AdminNavbar';

export default function Reports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    let unsub = null;
    let active = true;
    authReady.then(() => {
      if (!active) return;
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(q, (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    });
    return () => { active = false; if (unsub) unsub(); };
  }, []);

  const markResolved = async (id) => {
    await updateDoc(doc(db, 'reports', id), { status: 'resolved' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', marginLeft: 220, background: '#f4f7fb' }}>
      <AdminNavbar />

      <div style={{ padding: "30px" }}>
        <h1 style={{ marginBottom: 10, fontSize: 26, fontWeight: 700 }}>📢 User Reports</h1>
        <p style={{ color: "#666", marginBottom: 20 }}>
          View all user-submitted reports, conversations and mark resolved.
        </p>

        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 3px 15px rgba(0,0,0,0.08)"
        }}>
          
          {reports.length === 0 ? (
            <p style={{ fontSize: "18px", color: "gray", textAlign: "center", padding: "20px" }}>
              No reports submitted.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: "#1f7a8c", color: "white" }}>
                  <th style={th}>Created</th>
                  <th style={th}>Email</th>
                  <th style={th}>Messages</th>
                  <th style={th}>Status</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} style={row}>
                    <td style={td}>{r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : '-'}</td>
                    <td style={td}>{r.email || '-'}</td>
                    <td style={{ ...td, maxWidth: "400px" }}>
                      <div style={{ 
                        background: "#f9fafb", 
                        padding: "10px 12px", 
                        borderRadius: "8px", 
                        border: "1px solid #eee",
                        maxHeight: "200px",
                        overflowY: "auto"
                      }}>
                        {(r.messages || []).map((m, i) => (
                          <p key={i} style={{ margin: "6px 0", fontSize: "14px" }}>
                            <strong style={{ color: "#1f7a8c" }}>{m.role}:</strong> {m.text}
                          </p>
                        ))}
                      </div>
                    </td>

                    <td style={td}>
                      <span style={{
                        padding: "5px 12px",
                        borderRadius: "20px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: r.status === 'resolved' ? "#155724" : "#856404",
                        background: r.status === 'resolved' ? "#d4edda" : "#fff3cd",
                        border: "1px solid rgba(0,0,0,0.1)"
                      }}>
                        {r.status || "open"}
                      </span>
                    </td>

                    <td style={td}>
                      {r.status !== 'resolved' ? (
                        <button 
                          onClick={() => markResolved(r.id)} 
                          style={resolveBtn}
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <span style={{ color: "green", fontWeight: 600 }}>✔ Resolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const th = {
  padding: "12px",
  textAlign: "left",
  fontSize: "14px"
};

const td = {
  padding: "14px 10px",
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
  fontSize: "14px"
};

const row = {
  background: "white",
  transition: "0.2s ease"
};

const resolveBtn = {
  background: "#1f7a8c",
  border: "none",
  color: "white",
  padding: "8px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "14px",
  transition: "0.2s ease",
};

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', marginLeft: 220 }}>
      <AdminNavbar />
      <div style={{ padding: 20 }}>
        <h2>Reports</h2>
        {reports.length === 0 ? (
          <p>No reports submitted.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', background: '#fff' }}>
            <thead>
              <tr style={{ background: '#f1f3f5' }}>
                <th style={th}>Created</th>
                <th style={th}>Email</th>
                <th style={th}>Messages</th>
                <th style={th}>Status</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : '-'}</td>
                  <td style={td}>{r.email || '-'}</td>
                  <td style={td}>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {(r.messages || []).map((m, i) => (
                        <li key={i}><strong>{m.role}:</strong> {m.text}</li>
                      ))}
                    </ul>
                  </td>
                  <td style={td}>{r.status || 'open'}</td>
                  <td style={td}>
                    {r.status !== 'resolved' && (
                      <button onClick={() => markResolved(r.id)} style={{ padding: '6px 10px', border: 'none', borderRadius: 6, background: '#1f7a8c', color: '#fff' }}>Mark Resolved</button>
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
}

const th = { padding: 10, border: '1px solid #ddd', textAlign: 'left' };
const td = { padding: 8, border: '1px solid #ddd', verticalAlign: 'top' };





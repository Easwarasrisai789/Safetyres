import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, updatePassword as fbUpdatePassword } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import DriverMap from './DriverMap';

export default function DriverPortal() {
  const [user, setUser] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [allAssignments, setAllAssignments] = useState([]);
  const [driver, setDriver] = useState(null);
  const [driverDocId, setDriverDocId] = useState(null);
  const [activeTab, setActiveTab] = useState('assignment');
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', vehicleType: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();
  const locationRouter = useLocation();
  const searchParams = React.useMemo(() => new URLSearchParams(locationRouter.search), [locationRouter.search]);
  const impersonateDriverId = searchParams.get('impersonate');
  const [mapModal, setMapModal] = useState({ open: false, destination: null });

  const doLogout = async () => {
    await signOut(auth);
    navigate('/driver-login');
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user && !impersonateDriverId) return;
    const dq = impersonateDriverId
      ? query(collection(db, 'drivers'), where('__name__', '==', impersonateDriverId))
      : query(collection(db, 'drivers'), where('email', '==', user?.email || ''));
    const unsub = onSnapshot(dq, (snap) => {
      const d = snap.docs[0];
      const data = d?.data();
      setDriver(data || null);
      setDriverDocId(d?.id || null);
      if (!data) { setAssignment(null); setAllAssignments([]); return; }
      setProfileForm({
        name: data.name || '',
        phone: data.phone || '',
        vehicleType: data.vehicleType || '',
      });
      const rq = query(collection(db, 'emergencyRequests'), where('assignedDriverId', '==', d.id));
      const unsubReq = onSnapshot(rq, (rs) => {
        const list = rs.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
        setAllAssignments(list);
      });
      return () => unsubReq();
    });
    return () => unsub();
  }, [user, impersonateDriverId]);

  const { currentAssignment, historyAssignments } = React.useMemo(() => {
    const nowMs = Date.now();
    let current = null;
    const hist = [];
    for (const r of allAssignments) {
      const assignedAtMs = r.vehicleAssignedAt?.seconds
        ? r.vehicleAssignedAt.seconds * 1000
        : (r.vehicleAssignedAt ? Date.parse(r.vehicleAssignedAt) : null);
      const stillActive = assignedAtMs ? (nowMs - assignedAtMs) < (10 * 60 * 1000) : false;
      if (r.status === 'assigned' && stillActive && !current) {
        current = r;
      } else {
        hist.push(r);
      }
    }
    hist.sort((a, b) => {
      const am = a.vehicleAssignedAt?.seconds ? a.vehicleAssignedAt.seconds : 0;
      const bm = b.vehicleAssignedAt?.seconds ? b.vehicleAssignedAt.seconds : 0;
      return bm - am;
    });
    return { currentAssignment: current, historyAssignments: hist };
  }, [allAssignments]);

  const shareLocation = () => {
    if (!navigator.geolocation || !user) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const q = query(collection(db, 'drivers'), where('email', '==', user.email || ''));
      const unsub = onSnapshot(q, async (snap) => {
        const driverDoc = snap.docs[0];
        if (driverDoc) {
          await updateDoc(doc(db, 'drivers', driverDoc.id), {
            location: { latitude, longitude },
            lastSharedAt: new Date().toISOString(),
          });
          setNotification({ title: 'Location Shared', message: 'Your current location was sent.', type: 'success' });
        }
        unsub();
      });
    });
  };

  useEffect(() => {
    let id = null;
    const tick = () => {
      if (!navigator.geolocation || !user) return;
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const dq = query(collection(db, 'drivers'), where('email', '==', user.email || ''));
        const unsub = onSnapshot(dq, async (snap) => {
          const driverDoc = snap.docs[0];
          if (driverDoc) {
            await updateDoc(doc(db, 'drivers', driverDoc.id), {
              location: { latitude, longitude },
              lastSharedAt: new Date().toISOString(),
            });
          }
          unsub();
        });
      });
    };
    id = setInterval(tick, 60 * 1000);
    return () => { if (id) clearInterval(id); };
  }, [user]);

  const saveProfile = async () => {
    if (!driverDocId) return;
    await updateDoc(doc(db, 'drivers', driverDocId), {
      name: profileForm.name,
      phone: profileForm.phone,
      vehicleType: profileForm.vehicleType,
    });
    setNotification({ title: 'Profile Updated', message: 'Your profile was saved.', type: 'success' });
  };

  const changePassword = async () => {
    if (!user) { setNotification({ title: 'Error', message: 'Login required to update password.', type: 'error' }); return; }
    if (!passwordForm.next || passwordForm.next !== passwordForm.confirm) {
      setNotification({ title: 'Error', message: 'Passwords do not match.', type: 'error' }); return; }
    try {
      await fbUpdatePassword(auth.currentUser, passwordForm.next);
      setPasswordForm({ current: '', next: '', confirm: '' });
      setNotification({ title: 'Password Updated', message: 'Your password was changed.', type: 'success' });
    } catch (e) {
      setNotification({ title: 'Error', message: 'Failed to update password. Please re-login.', type: 'error' });
    }
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <h3 style={{ marginTop: 0 }}>Driver</h3>
        <ul style={styles.menu}>
          <li style={{ ...styles.menuItem, ...(activeTab === 'assignment' ? styles.menuItemActive : {}) }} onClick={() => setActiveTab('assignment')}>My Assignment</li>
          <li style={{ ...styles.menuItem, ...(activeTab === 'profile' ? styles.menuItemActive : {}) }} onClick={() => setActiveTab('profile')}>Profile</li>
          <li style={{ ...styles.menuItem, ...(activeTab === 'history' ? styles.menuItemActive : {}) }} onClick={() => setActiveTab('history')}>History</li>
        </ul>
        <button style={styles.logout} onClick={doLogout}>Logout</button>
      </aside>
      <main style={styles.main}>
        <h2 style={{ marginTop: 0, marginBottom: 20 }}>Driver Portal</h2>
        {!user && <p>Please log in.</p>}

        {/* Assignment Section */}
        {user && activeTab === 'assignment' && (
          <div style={styles.card}>
            <p><strong>{impersonateDriverId ? 'Impersonating Driver' : 'User'}:</strong> {impersonateDriverId ? (driver?.name || driver?.email || impersonateDriverId) : (user?.email)}</p>
            {!currentAssignment ? (
              <p>No vehicle assigned yet.</p>
            ) : (
              <div style={styles.assignmentGrid}>
                <div>
                  <p><strong>Assigned Vehicle:</strong> {currentAssignment.assignedVehicle}</p>
                  <p><strong>Type:</strong> {currentAssignment.assignedVehicleType || '-'}</p>
                  <p><strong>Status:</strong> {currentAssignment.status}</p>
                </div>
                <div>
                  <p><strong>Destination:</strong> {currentAssignment.latitude}, {currentAssignment.longitude}</p>
                  <DriverMap
                    driverLocation={driver?.location}
                    destination={{ latitude: currentAssignment.latitude, longitude: currentAssignment.longitude }}
                  />
                  <div style={{ marginTop: 12 }}>
                    <button style={styles.button} onClick={() => setMapModal({ open: true, destination: { latitude: currentAssignment.latitude, longitude: currentAssignment.longitude } })}>Expand Map</button>
                  </div>
                </div>
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <button style={styles.button} onClick={shareLocation}>Share Current Location</button>
            </div>
          </div>
        )}

        {/* Profile Section */}
        {user && activeTab === 'profile' && (
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>My Profile</h3>
            <div style={styles.formGrid}>
              <div>
                <label>Name</label>
                <input style={styles.input} value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
              </div>
              <div>
                <label>Phone</label>
                <input style={styles.input} value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              </div>
              <div>
                <label>Vehicle Type</label>
                <select style={styles.input} value={profileForm.vehicleType} onChange={(e) => setProfileForm({ ...profileForm, vehicleType: e.target.value })}>
                  <option value="ambulance">Ambulance</option>
                  <option value="fireengine">Fire Engine</option>
                  <option value="policevan">Police Van</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button style={styles.button} onClick={saveProfile}>Save</button>
            </div>

            <h3 style={{ marginTop: 24 }}>Update Password</h3>
            <div style={styles.formGrid}>
              <div>
                <label>New Password</label>
                <input type="password" style={styles.input} value={passwordForm.next} onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })} />
              </div>
              <div>
                <label>Confirm Password</label>
                <input type="password" style={styles.input} value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button style={styles.button} onClick={changePassword}>Change Password</button>
            </div>
          </div>
        )}

        {/* History Section */}
        {user && activeTab === 'history' && (
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Past Assignments</h3>
            {historyAssignments.length === 0 ? (
              <p>No past assignments.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={{ background: '#f1f3f5' }}>
                    <th style={styles.th}>Vehicle</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Assigned At</th>
                    <th style={styles.th}>Destination</th>
                    <th style={styles.th}>Map</th>
                  </tr>
                </thead>
                <tbody>
                  {historyAssignments.map((r) => {
                    const assignedAt = r.vehicleAssignedAt?.seconds ? new Date(r.vehicleAssignedAt.seconds * 1000).toLocaleString() : '-';
                    return (
                      <tr key={r.id}>
                        <td style={styles.td}>{r.assignedVehicle || '-'}</td>
                        <td style={styles.td}>{r.assignedVehicleType || '-'}</td>
                        <td style={styles.td}>{assignedAt}</td>
                        <td style={styles.td}>{(r.latitude && r.longitude) ? `${r.latitude}, ${r.longitude}` : '-'}</td>
                        <td style={styles.td}>
                          {(r.latitude && r.longitude) ? (
                            <button onClick={() => setMapModal({ open: true, destination: { latitude: r.latitude, longitude: r.longitude } })} style={styles.smallButton}>Open Map</button>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div style={styles.toast}>
            <div style={{ fontWeight: 'bold' }}>{notification.title}</div>
            <div>{notification.message}</div>
            <button style={styles.toastButton} onClick={() => setNotification(null)}>Close</button>
          </div>
        )}

        {/* Map Modal */}
        {mapModal.open && (
          <div style={styles.modalOverlay} onClick={() => setMapModal({ open: false, destination: null })}>
            <div style={styles.modalBody} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0 }}>Map</h3>
                <button style={styles.button} onClick={() => setMapModal({ open: false, destination: null })}>Close</button>
              </div>
              <DriverMap driverLocation={driver?.location} destination={mapModal.destination} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Arial, sans-serif' },
  sidebar: {
    position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
    background: 'linear-gradient(to bottom, #2c3e50, #2f3b4a)', color: '#fff',
    padding: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column'
  },
  main: { marginLeft: 240, padding: 24, width: '100%', boxSizing: 'border-box' },
  menu: { listStyle: 'none', padding: 0, margin: '20px 0' },
  menuItem: { padding: '10px 0', cursor: 'pointer', opacity: 0.85 },
  menuItemActive: { fontWeight: 'bold', opacity: 1 },
  card: {
    background: '#fff', border: '1px solid #eaeaea', borderRadius: 10,
    padding: 20, boxShadow: '0 4px 10px rgba(0,0,0,0.05)', marginBottom: 24
  },
  assignmentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    alignItems: 'flex-start'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginTop: 12
  },
  button: {
    padding: '10px 16px', borderRadius: 8, border: 'none', background: '#1f7a8c',
    color: '#fff', cursor: 'pointer', fontWeight: 'bold'
  },
  smallButton: {
    padding: '6px 12px', borderRadius: 6, border: 'none', background: '#1f7a8c',
    color: '#fff', cursor: 'pointer', fontSize: 13
  },
  th: { padding: 10, border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: 8, border: '1px solid #ddd' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #dcdde1', boxSizing: 'border-box'
  },
  logout: {
    marginTop: 'auto', width: '100%', padding: '10px 12px',
    borderRadius: 8, border: 'none', background: '#e63946',
    color: '#fff', cursor: 'pointer', fontWeight: 'bold'
  },
  modalOverlay: {
    position: 'fixed', left: 0, top: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 2000
  },
  modalBody: {
    width: '90%', maxWidth: 900, background: '#fff',
    borderRadius: 10, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toast: {
    position: 'fixed', right: 16, bottom: 16, background: '#2d3436',
    color: '#fff', padding: '12px 16px', borderRadius: 8,
    boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
  },
  toastButton: {
    marginTop: 6, background: '#636e72', color: '#fff', border: 'none',
    borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12
  }
};

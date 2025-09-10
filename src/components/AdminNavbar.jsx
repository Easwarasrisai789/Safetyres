import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { db, authReady } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

const AdminNavbar = () => {
  const [assignedCount, setAssignedCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    let unsubscribe = null;
    let active = true;
    authReady.then(() => {
      if (!active) return;
      const q = query(
        collection(db, 'emergencyRequests'),
        where('status', '==', 'assigned')
      );
      unsubscribe = onSnapshot(q, (snap) => {
        setAssignedCount(snap.size);
      });
    });
    return () => { active = false; if (unsubscribe) unsubscribe(); };
  }, []);

  const isActive = (path) => location.pathname.toLowerCase() === path.toLowerCase();

  return (
    <nav style={styles.navbar}>
      <h2 style={styles.logo}>Admin Panel</h2>
      <div style={styles.navGroup}>
        <div style={styles.sectionTitle}>Navigation</div>
        <ul style={styles.navLinks}>
          <li>
            <Link style={{ ...styles.link, ...(isActive('/admin') ? styles.linkActive : {}) }} to="/admin">
              Dashboard
            </Link>
          </li>
          <li>
            <Link style={{ ...styles.link, ...(isActive('/requests') ? styles.linkActive : {}) }} to="/requests">
              Requests
            </Link>
          </li>
          <li>
            <Link style={{ ...styles.link, ...(isActive('/accepted-requests') ? styles.linkActive : {}) }} to="/accepted-requests">
              Accepted Requests
            </Link>
          </li>
          <li>
            <Link style={{ ...styles.link, ...(isActive('/AssignedVehicles') ? styles.linkActive : {}) }} to="/AssignedVehicles">
              Assigned Vehicles {assignedCount > 0 && (
                <span style={styles.badge}>{assignedCount}</span>
              )}
            </Link>
          </li>
          <li>
            <Link style={{ ...styles.link, ...(isActive('/reports') ? styles.linkActive : {}) }} to="/reports">
              Reports
            </Link>
          </li>
        </ul>

        <div style={styles.divider} />

        <div style={styles.sectionTitle}>People</div>
        <ul style={styles.navLinks}>
          <li>
            <Link style={{ ...styles.link, ...(isActive('/drivers') ? styles.linkActive : {}) }} to="/drivers">
              Drivers
            </Link>
          </li>
          <li>
            <Link style={{ ...styles.link, ...(isActive('/driver-login') ? styles.linkActive : {}) }} to="/driver-login">
              Driver Login
            </Link>
          </li>
        </ul>

        <div style={styles.divider} />

        <ul style={styles.navLinks}>
          <li>
            <Link style={{ ...styles.link, ...(isActive('/') ? styles.linkActive : {}) }} to="/">
              Logout
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '220px',
    background: 'linear-gradient(to bottom, #2c3e50, #2f3b4a)',
    color: '#fff',
    padding: '16px 12px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 1000,
  },
  logo: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 'bold',
    padding: '6px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    marginBottom: '6px'
  },
  navLinks: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: '1fr',
    rowGap: '8px',
    margin: 0,
    padding: 0,
  },
  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  link: {
    textDecoration: 'none',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: '10px 12px',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    backdropFilter: 'saturate(140%) blur(2px)',
    display: 'block',
    width: '90%',
    textAlign: 'left',
  },
  linkHover: {
    background: 'rgba(255,255,255,0.16)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
  },
  linkActive: {
    background: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.65)'
  },
  sectionTitle: {
    marginTop: '6px',
    marginBottom: '2px',
    fontSize: '0.8rem',
    opacity: 0.8,
    padding: '0 4px'
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.25)',
    margin: '6px 2px'
  },
  badge: {
    marginLeft: '8px',
    backgroundColor: '#ff4444',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
  },
};

export default AdminNavbar;

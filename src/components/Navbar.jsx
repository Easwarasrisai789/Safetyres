import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={styles.navbar}>
      <h2 style={styles.logo}>Emer_Responce</h2>
      <ul style={styles.navLinks}>
        <li><NavLinkButton to="/">Home</NavLinkButton></li>
        <li><NavLinkButton to="/admin-login">Admin Login</NavLinkButton></li>
        <li><NavLinkButton to="/driver-login">Driver Login</NavLinkButton></li>
        <li><NavLinkButton to="/contact">Contact</NavLinkButton></li>
      </ul>
    </nav>
  );
};
 
const NavLinkButton = ({ to, children }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const combinedStyle = {
    ...styles.link,
    ...(isHovered ? styles.linkHover : {}),
    ...(isActive ? styles.linkActive : {}),
  };

  return (
    <Link
      to={to}
      style={combinedStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      {children}
    </Link>
  );
};

// Styles matching your screenshot design
const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(to right, #2c3e50, #34495e)', // dark navy gradient
    color: '#fff',
    padding: '15px 5%',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    width: '100%',
    boxSizing: 'border-box',
  },
  logo: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  navLinks: {
    listStyle: 'none',
    display: 'flex',
    gap: '15px',
    margin: 0,
    padding: 0,
  },
  link: {
    textDecoration: 'none',
    background: 'rgba(255,255,255,0.06)',
    border: '2px solid rgba(255,255,255,0.65)',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '10px 18px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    backdropFilter: 'saturate(140%) blur(2px)',
  },
  linkHover: {
    background: 'rgba(255,255,255,0.16)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
  },
  linkActive: {
    transform: 'translateY(0)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    background: 'rgba(255,255,255,0.22)',
  },
};

export default Navbar;

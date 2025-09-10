import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase'; 

import Navbar from '../components/Navbar';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');

    try {
      // Login with Firebase
      await signInWithEmailAndPassword(auth, email, password);

      // Always navigate to admin dashboard after login
      navigate('/admin');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email to reset password');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Password reset email sent. Check your inbox.');
      setError('');
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
      setResetMessage('');
    }
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <form onSubmit={handleLogin} style={styles.form}>
          <h2 style={styles.title}>Login</h2>

          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
            placeholder="Enter Email"
          />

          <label style={styles.label}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
            placeholder="Enter Password"
          />

          {error && <p style={styles.error}>{error}</p>}
          {resetMessage && <p style={styles.success}>{resetMessage}</p>}

          <button type="submit" style={styles.button}>Login</button>

          <p style={styles.forgot}>
            <button type="button" onClick={handleForgotPassword} style={styles.linkBtn}>
              Forgot Password?
            </button>
          </p>
        </form>
      </div>
    </>
  );
}

const styles = {
  container: {
    padding: '50px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif'
  },
  form: {
    backgroundColor: '#2c2c2c', // dark gray box
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '360px',
    color: 'white'
  },
  title: {
    marginBottom: '10px',
    fontSize: '22px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white'
  },
  label: {
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'left'
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #444',
    borderRadius: '8px',
    backgroundColor: '#3a3a3a',
    color: 'white'
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#ff4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  error: {
    color: '#ff4444',
    fontSize: '14px',
    margin: 0
  },
  success: {
    color: '#00ff00',
    fontSize: '14px',
    margin: 0
  },
  forgot: {
    marginTop: '10px',
    textAlign: 'center'
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    textDecoration: 'none',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

export default AdminLogin;

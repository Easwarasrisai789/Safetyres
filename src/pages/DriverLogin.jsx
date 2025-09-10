import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import Navbar from '../components/Navbar';

export default function DriverLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/driver');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  const onForgot = async () => {
    setError('');
    setInfo('');
    if (!email) {
      setError('Enter your email to reset password');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo('Password reset email sent. Check your inbox.');
    } catch (e) {
      setError('Failed to send reset email.');
    }
  };

  return (
    <>
      <Navbar />
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h2 style={styles.title}>Driver Login</h2>
          <form onSubmit={onSubmit} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <div style={styles.error}>{error}</div>}
            {info && <div style={styles.info}>{info}</div>}
            <div style={styles.buttonRow}>
              <button style={styles.button} type="submit">
                Login
              </button>
              <button
                type="button"
                onClick={onForgot}
                style={{ ...styles.button, background: '#6c757d' }}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: 28,
    color: 'white',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
  },
  title: {
    margin: 0,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  input: {
    padding: '12px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    color: 'white',
    fontSize: 14,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
  },
  info: {
    color: '#38b000',
    fontSize: 13,
    textAlign: 'center',
  },
  buttonRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#1f7a8c',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 14,
    transition: 'background 0.3s',
  },
};
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

function EmergencyForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle: '',
  });

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null
  });

  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false); // Loading state

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          setLocationError("Location access denied or unavailable.");
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading

    const submission = {
      ...formData,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date()
    };

    try {
      await addDoc(collection(db, "emergencyRequests"), submission);
      alert('Emergency request submitted successfully!');
      setFormData({ name: '', phone: '', vehicle: '' }); // Reset form
    } catch (error) {
      console.error("Error adding document: ", error);
      alert('Error submitting request. Please try again.');
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>Emergency Response Form</h1>
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={styles.input}
            />

            <label style={styles.label}>Phone Number:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              pattern="[0-9]{10}"
              style={styles.input}
            />

            <label style={styles.label}>Select Emergency Vehicle:</label>
            <select
              name="vehicle"
              value={formData.vehicle}
              onChange={handleChange}
              required
              style={styles.input}
            >
              <option value="">-- Select --</option>
              <option value="Ambulance">Ambulance</option>
              <option value="Fire Engine">Fire Engine</option>
              <option value="Police Van">Police Van</option>
              <option value="Others">Others (etc)</option>
            </select>

            {locationError && <p style={styles.error}>{locationError}</p>}
            {!locationError && location.latitude && (
              <p style={styles.location}>
                Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </p>
            )}

            <button 
              type="submit" 
              style={{
                ...styles.button,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px',
    boxSizing: 'border-box'
  },
  container: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #ccc',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    boxSizing: 'border-box'
  },
  title: {
    fontSize: '1.5rem',
    textAlign: 'center',
    marginBottom: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  label: {
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  input: {
    padding: '10px',
    fontSize: '1rem',
    borderRadius: '6px',
    border: '1px solid #bbb',
    width: '100%',
    boxSizing: 'border-box'
  },
  button: {
    padding: '12px',
    fontSize: '1rem',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold'
  },
  error: {
    color: 'red',
    fontSize: '0.9rem'
  },
  location: {
    fontSize: '0.9rem',
    color: '#333'
  }
};

export default EmergencyForm;

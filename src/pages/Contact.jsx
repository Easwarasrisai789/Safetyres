import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

function Contact() {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [emailForReport, setEmailForReport] = useState("");

  const onSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', text: chatInput.trim(), ts: Date.now() },
    ]);
    setChatInput("");
  };

  const onSubmitReport = async () => {
    if (chatMessages.length === 0) return;
    try {
      await addDoc(collection(db, 'reports'), {
        email: emailForReport || null,
        messages: chatMessages,
        createdAt: serverTimestamp(),
        status: 'open',
      });
      setChatMessages([]);
      alert('Report submitted to admin.');
    } catch (e) {
      alert('Failed to submit report.');
    }
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <h2 style={styles.heading}>Contact Us</h2>

        {/* Reviews */}
        <h3 style={styles.reviewHeading}>What people are saying</h3>
        <div style={styles.reviews}>
          <div style={{ ...styles.reviewCard, backgroundColor: "#f0f4f8" }}>
            <p>🚑 “Fast and reliable emergency response. Really helped us in a tough time.”</p>
            <span>- Arjun Reddy</span>
          </div>
          <div style={{ ...styles.reviewCard, backgroundColor: "#fff3e6" }}>
            <p>🔥 “Called for fire help — response was quick and coordinated. Highly recommended.”</p>
            <span>- Priya Sharma</span>
          </div>
          <div style={{ ...styles.reviewCard, backgroundColor: "#e8f7ee" }}>
            <p>👮 “Police van reached within 5 minutes. Hats off to the team.”</p>
            <span>- Rakesh Kumar</span>
          </div>
        </div>

        {/* Chatbot/Support */}
        <div style={styles.chatCard}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Chat with Support</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Your email (optional)"
              value={emailForReport}
              onChange={(e) => setEmailForReport(e.target.value)}
              style={{ ...styles.chatInput, flex: 0.6 }}
            />
          </div>
          <div style={styles.chatBox}>
            {chatMessages.length === 0 ? (
              <div style={{ color: '#777', textAlign: 'center' }}>
                Start typing your issue below…
              </div>
            ) : (
              chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent:
                      m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      background: m.role === 'user' ? '#007BFF' : '#f1f3f5',
                      color: m.role === 'user' ? '#fff' : '#333',
                      padding: '8px 12px',
                      borderRadius: 12,
                      margin: '6px 0',
                      maxWidth: '70%',
                      fontSize: 14,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={styles.chatInputRow}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Describe your problem…"
              style={styles.chatInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSendChat();
                }
              }}
            />
            <button
              type="button"
              style={styles.chatSend}
              onClick={onSendChat}
            >
              Send
            </button>
            <button
              type="button"
              style={styles.chatReport}
              onClick={onSubmitReport}
            >
              Submit Report
            </button>
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#555',
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            Reports are forwarded to the admin Reports page.
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    padding: '40px 5%',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  heading: {
    textAlign: 'center',
    fontSize: '2rem',
    marginBottom: '30px',
    color: '#222',
  },
  reviewHeading: {
    marginTop: '50px',
    textAlign: 'center',
    color: '#333',
  },
  reviews: {
    marginTop: '20px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    justifyContent: 'center',
  },
  reviewCard: {
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '300px',
    textAlign: 'left',
    color: '#111',
  },
  chatCard: {
    marginTop: '50px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    maxWidth: 800,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  chatBox: {
    height: 220,
    overflowY: 'auto',
    border: '1px solid #ccc',
    borderRadius: 10,
    padding: 12,
    background: '#fff',
    marginBottom: 10,
  },
  chatInputRow: {
    display: 'flex',
    gap: 8,
    marginTop: 6,
  },
  chatInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #bbb',
    borderRadius: 8,
    fontSize: 14,
  },
  chatSend: {
    padding: '10px 14px',
    border: 'none',
    borderRadius: 8,
    background: '#1f7a8c',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  chatReport: {
    padding: '10px 14px',
    border: 'none',
    borderRadius: 8,
    background: '#e63946',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};

export default Contact;

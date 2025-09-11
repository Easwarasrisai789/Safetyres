import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

function Contact() {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [emailForReport, setEmailForReport] = useState("");
  const [feedbacks, setFeedbacks] = useState([]);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");

  // Live load latest 3 feedback entries
  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(3));
    const unsub = onSnapshot(q, (snap) => {
      setFeedbacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

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

  const onSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    try {
      await addDoc(collection(db, 'feedback'), {
        rating: Number(rating),
        message: feedbackText.trim(),
        createdAt: serverTimestamp(),
      });
      setFeedbackText("");
      setRating(5);
    } catch (e) {
      alert('Failed to submit feedback.');
    }
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <h2 style={styles.heading}>Contact Us</h2>

        {/* Reviews - live from feedback */}
        <h3 style={styles.reviewHeading}>What people are saying</h3>
        <div style={styles.reviews}>
          {feedbacks.length === 0 ? (
            <div style={{ ...styles.reviewCard, backgroundColor: '#f0f4f8' }}>
              <p>No feedback yet. Be the first to leave a review below.</p>
            </div>
          ) : (
            feedbacks.map((f) => (
              <div key={f.id} style={{ ...styles.reviewCard, backgroundColor: '#f0f4f8' }}>
                <div style={{ marginBottom: 8 }}>
                  {"★".repeat(Math.max(0, Math.min(5, Number(f.rating) || 0)))}
                  {"☆".repeat(5 - Math.max(0, Math.min(5, Number(f.rating) || 0)))}
                </div>
                <p style={{ marginBottom: 6 }}>{f.message}</p>
                <span style={{ fontSize: 12, color: '#555' }}>{f.createdAt?.seconds ? new Date(f.createdAt.seconds * 1000).toLocaleString() : ''}</span>
              </div>
            ))
          )}
        </div>

        {/* Feedback Form */}
        <div style={styles.feedbackCard}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>Leave your feedback</h3>
          <form onSubmit={onSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontWeight: 'bold' }}>Rating</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)} style={styles.input}>
              <option value={5}>★★★★★ (5)</option>
              <option value={4}>★★★★☆ (4)</option>
              <option value={3}>★★★☆☆ (3)</option>
              <option value={2}>★★☆☆☆ (2)</option>
              <option value={1}>★☆☆☆☆ (1)</option>
            </select>
            <label style={{ fontWeight: 'bold' }}>Message</label>
            <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Share your experience..." rows={3} style={styles.textarea} />
            <button type="submit" style={styles.feedbackSubmit}>Submit Feedback</button>
          </form>
          <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
            Latest three reviews above update automatically from submitted feedback.
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
  feedbackCard: {
    marginTop: '30px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    maxWidth: 800,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #bbb',
    borderRadius: 8,
    fontSize: 14,
    background: '#fff',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #bbb',
    borderRadius: 8,
    fontSize: 14,
    background: '#fff',
    resize: 'vertical',
  },
  feedbackSubmit: {
    padding: '10px 14px',
    border: 'none',
    borderRadius: 8,
    background: '#2a9d8f',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
    alignSelf: 'flex-start',
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

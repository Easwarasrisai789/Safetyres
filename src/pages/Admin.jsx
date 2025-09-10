import React, { useEffect, useState } from "react";
import { db, authReady } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import AdminNavbar from "../components/AdminNavbar";
import { Bar, Pie } from "react-chartjs-2";
import "chart.js/auto";

function Admin() {
  const [requests, setRequests] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ✅ Fetch Firestore data
  useEffect(() => {
    let unsubscribe = null;
    let active = true;
    authReady.then(() => {
      if (!active) return;
      unsubscribe = onSnapshot(collection(db, "emergencyRequests"), (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : null,
        }));
        setRequests(data);
      });
    });
    return () => { active = false; if (unsubscribe) unsubscribe(); };
  }, []);

  const totalEmergencies = requests.length;

  // ✅ Group by year & month
  const groupedData = {};
  requests.forEach((req) => {
    if (req.timestamp) {
      const year = req.timestamp.getFullYear();
      const month = req.timestamp.toLocaleString("default", { month: "short" });
      if (!groupedData[year]) groupedData[year] = {};
      groupedData[year][month] = (groupedData[year][month] || 0) + 1;
    }
  });

  // ✅ Extract available years
  const years = Object.keys(groupedData).sort((a, b) => b - a);

  useEffect(() => {
    if (years.length > 0 && !years.includes(String(selectedYear))) {
      setSelectedYear(Number(years[0])); // default latest available year
    }
  }, [years, selectedYear]);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  // ✅ Bar chart data for selected year
  const emergenciesByMonth = months.reduce((acc, m) => {
    acc[m] = groupedData[selectedYear]?.[m] || 0;
    return acc;
  }, {});

  const avgPerMonth =
    Object.values(emergenciesByMonth).reduce((a, b) => a + b, 0) /
    (months.length || 1);

  // ✅ Request status counts
  const acceptedCount = requests.filter(
    (r) => r.status?.toLowerCase() === "accepted"
  ).length;
  const rejectedCount = requests.filter(
    (r) => r.status?.toLowerCase() === "rejected"
  ).length;
  

  // ✅ Highlight current month bar
  const currentMonth = new Date().toLocaleString("default", { month: "short" });
  const barColors = months.map((m) =>
    m === currentMonth ? "rgba(25, 118, 210, 0.9)" : "rgba(54, 162, 235, 0.6)"
  );

  return (
    <>
      <AdminNavbar />
      <div style={{ ...styles.container, marginLeft: 220 }}>
        <h1 style={styles.title}>📊 Admin Dashboard - Live Analysis</h1>

        {/* KPIs */}
        <div style={styles.kpiContainer}>
          <div style={styles.kpiCard}>
            <h3>Total Emergencies</h3>
            <p>{totalEmergencies}</p>
          </div>
          <div style={styles.kpiCard}>
            <h3>Avg Emergencies / Month</h3>
            <p>{avgPerMonth.toFixed(2)}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div style={styles.chartsContainer}>
          {/* ✅ Bar Chart */}
          <div style={styles.chartCardSmall}>
            <h2>Requests Per Month</h2>

            {/* Year Dropdown */}
            {years.length > 0 && (
              <select
                style={styles.dropdown}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}

            <div style={{ height: "230px", width: "100%" }}>
              <Bar
                data={{
                  labels: months,
                  datasets: [
                    {
                      label: "Requests",
                      data: months.map((m) => emergenciesByMonth[m]),
                      backgroundColor: barColors,
                      barThickness: 25, // ✅ thinner bars
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { font: { size: 12 } } },
                    y: { ticks: { font: { size: 12 } }, beginAtZero: true },
                  },
                }}
              />
            </div>
          </div>

          {/* ✅ Pie Chart */}
          <div style={styles.chartCardSmall}>
            <h2>Accepted vs Rejected </h2>
            <div
              style={{
                height: "230px",
                width: "100%",
                maxWidth: "250px",
                margin: "0 auto",
              }}
            >
              <Pie
                data={{
                  labels: ["Accepted", "Rejected"],
                  datasets: [
                    {
                      data: [acceptedCount, rejectedCount],
                      backgroundColor: [
                        "rgba(75, 192, 192, 0.6)", // green
                        "rgba(255, 99, 132, 0.6)", // red
                        "rgba(255, 206, 86, 0.6)", // yellow
                      ],
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    padding: "40px",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "20px",
  },
  kpiContainer: {
    display: "flex",
    gap: "20px",
    marginBottom: "30px",
  },
  kpiCard: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    flex: "1",
    textAlign: "center",
  },
  chartsContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
  },
  chartCardSmall: {
    backgroundColor: "#fff",
    padding: "15px",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    height: "320px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  dropdown: {
    padding: "6px 10px",
    marginBottom: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
    cursor: "pointer",
  },
};

export default Admin;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import EmergencyForm from './pages/EmergencyForm';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';
import Contact from './pages/Contact';
import RequestsPage from './pages/RequestsPage';
import AcceptedRequests from "./pages/AcceptedRequests";
import AssignedVehicles from './pages/AssignedVehicles';
import AnimatedLogo from './pages/AnimatedLogo';
import Drivers from './pages/Drivers';
import DriverPortal from './pages/DriverPortal';
import DriverLogin from './pages/DriverLogin';
import Reports from './pages/Reports';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EmergencyForm />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/requests" element={<RequestsPage/>}/>
        <Route path="/accepted-requests" element={<AcceptedRequests />} />
        <Route path="/AssignedVehicles" element={<AssignedVehicles/>}/>
        <Route path="/drivers" element={<Drivers/>}/>
        <Route path="/driver-login" element={<DriverLogin/>}/>
        <Route path="/driver" element={<DriverPortal/>}/>
        <Route path="/reports" element={<Reports/>}/>
        <Route path="/AnimatedLogo" element={<AnimatedLogo/>}/>

      </Routes>
    </Router>
  );
}

export default App;

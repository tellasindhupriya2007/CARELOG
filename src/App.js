import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import PwaWrapper from './components/common/PwaWrapper';

// Auth
import Splash from './pages/auth/Splash';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Caretaker
import CaretakerHome from './pages/caretaker/Home';
import VitalsEntry from './pages/caretaker/VitalsEntry';
import AlertConfirmation from './pages/caretaker/AlertConfirmation';
import Observations from './pages/caretaker/Observations';
import ShiftHandover from './pages/caretaker/ShiftHandover';

// Family
import FamilyHome from './pages/family/Home';
import FamilyAlerts from './pages/family/Alerts';
import FamilyPrescriptions from './pages/family/Prescriptions';
import FamilyReport from './pages/family/WeeklyReport';

// Onboarding
import PatientBasicDetails from './pages/onboarding/PatientBasicDetails';
import CarePlanSetup from './pages/onboarding/CarePlanSetup';
import InviteCaretaker from './pages/onboarding/InviteCaretaker';

// Doctor
import DoctorDashboard from './pages/doctor/Dashboard';
import PatientDetails from './pages/doctor/PatientDetails';
import PrescriptionUpdate from './pages/doctor/PrescriptionUpdate';
import DoctorReport from './pages/doctor/WeeklyReport';
import DoctorAlerts from './pages/doctor/Alerts';
import DoctorReportsList from './pages/doctor/Reports';

function App() {
  return (
    <AuthProvider>
      <Router>
        <PwaWrapper>
          <Routes>
            {/* Base Fallback (redirects to splash) */}
            <Route path="/" element={<Navigate to="/auth/splash" replace />} />

            {/* Auth Group */}
            <Route path="/auth/splash" element={<Splash />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />

            {/* Caretaker Group */}
            <Route element={<PrivateRoute allowedRoles={['caretaker']} />}>
              <Route path="/caretaker/dashboard" element={<CaretakerHome />} />
              <Route path="/caretaker/vitals" element={<VitalsEntry />} />
              <Route path="/caretaker/alert-confirmation" element={<AlertConfirmation />} />
              <Route path="/caretaker/observations" element={<Observations />} />
              <Route path="/caretaker/handover" element={<ShiftHandover />} />
            </Route>

            {/* Family Group (Includes onboarding since family sets up the plan) */}
            <Route element={<PrivateRoute allowedRoles={['family']} />}>
              <Route path="/family/dashboard" element={<FamilyHome />} />
              <Route path="/family/alerts" element={<FamilyAlerts />} />
              <Route path="/family/prescriptions" element={<FamilyPrescriptions />} />
              <Route path="/family/report" element={<FamilyReport />} />

              <Route path="/family/onboarding/step-1" element={<PatientBasicDetails />} />
              <Route path="/family/onboarding/step-2" element={<CarePlanSetup />} />
              <Route path="/family/onboarding/step-3" element={<InviteCaretaker />} />
            </Route>

            {/* Doctor Group */}
            <Route element={<PrivateRoute allowedRoles={['doctor']} />}>
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/patient/:id" element={<PatientDetails />} />
              <Route path="/doctor/prescription/:id" element={<PrescriptionUpdate />} />
              <Route path="/doctor/report/:id" element={<DoctorReport />} />
              <Route path="/doctor/alerts" element={<DoctorAlerts />} />
              <Route path="/doctor/reports" element={<DoctorReportsList />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/auth/splash" replace />} />
          </Routes>
        </PwaWrapper>
      </Router>
    </AuthProvider>
  );
}

export default App;

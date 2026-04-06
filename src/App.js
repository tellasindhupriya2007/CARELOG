import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DoctorProvider } from './context/DoctorContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './components/common/PrivateRoute';
import PwaWrapper from './components/common/PwaWrapper';
import TaskMonitor from './services/TaskMonitor';

// Auth
import Splash from './pages/auth/Splash';
import RoleConfirm from './pages/auth/RoleConfirm';

// Caretaker
import CaretakerHome from './pages/caretaker/Home';
import VitalsEntry from './pages/caretaker/VitalsEntry';
import AlertConfirmation from './pages/caretaker/AlertConfirmation';
import AlertsPage from './pages/caretaker/Alerts';
import Observations from './pages/caretaker/Observations';
import ShiftHandover from './pages/caretaker/ShiftHandover';
import CaretakerMessages from './pages/caretaker/Messages';
import CaretakerPrescriptions from './pages/caretaker/Prescriptions';

// Family
import FamilyHome from './pages/family/Home';
import FamilyAlerts from './pages/family/Alerts';
import FamilyPrescriptions from './pages/family/Prescriptions';
import FamilyReport from './pages/family/WeeklyReport';
import FamilyMessages from './pages/family/Messages';

// Onboarding
import PatientBasicDetails from './pages/onboarding/PatientBasicDetails';
import CarePlanSetup from './pages/onboarding/CarePlanSetup';
import InviteCaretaker from './pages/onboarding/InviteCaretaker';

// Doctor — Page Wrappers
import DoctorDashboard from './pages/doctor/Dashboard';
import PatientDetails from './pages/doctor/PatientDetails';
import PrescriptionUpdate from './pages/doctor/PrescriptionUpdate';
import DoctorReport from './pages/doctor/WeeklyReport';
import DoctorAlerts from './pages/doctor/Alerts';
import DoctorReportsList from './pages/doctor/Reports';
import DoctorMessages from './pages/doctor/Messages';
import DoctorSettings from './pages/doctor/Settings';
import AddPatient from './pages/doctor/AddPatient';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <DoctorProvider>
          <Router>
            <PwaWrapper>
              <TaskMonitor />
              <Routes>
                {/* Base */}
                <Route path="/" element={<Navigate to="/auth/splash" replace />} />

                {/* Auth */}
                <Route path="/auth/splash" element={<Splash />} />
                <Route path="/auth/confirm" element={<RoleConfirm />} />
                <Route path="/auth/login" element={<Navigate to="/auth/splash" replace />} />
                <Route path="/auth/register" element={<Navigate to="/auth/splash" replace />} />

                {/* Caretaker */}
                <Route element={<PrivateRoute allowedRoles={['caretaker']} />}>
                  <Route path="/caretaker/dashboard" element={<CaretakerHome />} />
                  <Route path="/caretaker/vitals" element={<VitalsEntry />} />
                  <Route path="/caretaker/alerts" element={<AlertsPage />} />
                  <Route path="/caretaker/alert-confirmation" element={<AlertConfirmation />} />
                  <Route path="/caretaker/observations" element={<Observations />} />
                  <Route path="/caretaker/handover" element={<ShiftHandover />} />
                  <Route path="/caretaker/messages" element={<CaretakerMessages />} />
                  <Route path="/caretaker/prescriptions" element={<CaretakerPrescriptions />} />
                </Route>

                {/* Family */}
                <Route element={<PrivateRoute allowedRoles={['family']} />}>
                  <Route path="/family/dashboard" element={<FamilyHome />} />
                  <Route path="/family/alerts" element={<FamilyAlerts />} />
                  <Route path="/family/prescriptions" element={<FamilyPrescriptions />} />
                  <Route path="/family/report" element={<FamilyReport />} />
                  <Route path="/family/messages" element={<FamilyMessages />} />
                  <Route path="/family/onboarding/step-1" element={<PatientBasicDetails />} />
                  <Route path="/family/onboarding/step-2" element={<CarePlanSetup />} />
                  <Route path="/family/onboarding/step-3" element={<InviteCaretaker />} />
                </Route>

                {/* Doctor */}
                <Route element={<PrivateRoute allowedRoles={['doctor']} />}>
                  <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                  <Route path="/doctor/patient/:id" element={<PatientDetails />} />
                  <Route path="/doctor/prescription/:id" element={<PrescriptionUpdate />} />
                  <Route path="/doctor/report/:id" element={<DoctorReport />} />
                  <Route path="/doctor/alerts" element={<DoctorAlerts />} />
                  <Route path="/doctor/reports" element={<DoctorReportsList />} />
                  <Route path="/doctor/messages" element={<DoctorMessages />} />
                  <Route path="/doctor/settings" element={<DoctorSettings />} />
                  <Route path="/doctor/add-patient" element={<AddPatient />} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/auth/splash" replace />} />
              </Routes>
            </PwaWrapper>
          </Router>
        </DoctorProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

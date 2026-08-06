import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import AdminLayout from "./components/AdminLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DoctorsPage from "./pages/DoctorsPage";
import ServicesPage from "./pages/ServicesPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import SchedulePage from "./pages/SchedulePage";
import PatientsPage from "./pages/PatientsPage";
import PaymentsPage from "./pages/PaymentsPage";
import MembershipsPage from "./pages/MembershipsPage";
import InsurancePage from "./pages/InsurancePage";
import GalleryPage from "./pages/GalleryPage";
import TestimonialsPage from "./pages/TestimonialsPage";
import CmsPage from "./pages/CmsPage";
import SettingsPage from "./pages/SettingsPage";
import ContactMessagesPage from "./pages/ContactMessagesPage";
import UsersPage from "./pages/UsersPage";

const rawBase = import.meta.env.BASE_URL;
const basename =
  !rawBase || rawBase === "/" || rawBase === "./"
    ? undefined
    : rawBase.replace(/\/$/, "") || undefined;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route element={<RoleRoute />}>
                <Route index element={<DashboardPage />} />
                <Route path="doctors" element={<DoctorsPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="patients" element={<PatientsPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="memberships" element={<MembershipsPage />} />
                <Route path="insurance" element={<InsurancePage />} />
                <Route path="gallery" element={<GalleryPage />} />
                <Route path="testimonials" element={<TestimonialsPage />} />
                <Route path="cms" element={<CmsPage />} />
                <Route path="contact-messages" element={<ContactMessagesPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

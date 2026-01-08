import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

import AppShell from './components/AppShell';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import OtpVerificationPage from './pages/Auth/OtpVerificationPage';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import DashboardHome from './pages/Dashboard/DashboardHome';
import ProductCatalog from './pages/Catalog/ProductCatalog';
import DesignerPage from './pages/Designer/DesignerPage';
import MyOrdersPage from './pages/Orders/MyOrdersPage';
import EditProfilePage from './pages/Profile/EditProfilePage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<OtpVerificationPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={<Navigate to="/catalog" replace />} />

      <Route element={<AppShell />}>
        <Route path="/catalog" element={<ProductCatalog />} />
        <Route path="/designer/:productId" element={<DesignerPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/orders" element={<MyOrdersPage />} />
          <Route path="/profile" element={<EditProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/catalog" replace />} />
    </Routes>
  );
}

export default App;

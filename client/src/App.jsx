import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProjectPage from "./pages/ProjectPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import MyTasksPage from "./pages/MyTasksPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={<Private><Dashboard /></Private>} />
        <Route path="/my-tasks" element={<Private><MyTasksPage /></Private>} />
        <Route path="/calendar" element={<Private><CalendarPage /></Private>} />
        <Route path="/analytics" element={<Private><AnalyticsPage /></Private>} />
        <Route path="/projects/:id" element={<Private><ProjectPage /></Private>} />
        <Route path="/profile" element={<Private><ProfilePage /></Private>} />
      </Routes>
    </SocketProvider>
  );
}
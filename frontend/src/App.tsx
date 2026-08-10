// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./store/authStore";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import GroupDetail from "./pages/GroupDetail";
import JoinGroup from "./pages/JoinGroup";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Zero-friction join (no auth required) */}
          <Route path="/g/:inviteToken" element={<JoinGroup />} />
          {/* Group detail uses guest JWT from localStorage — no user auth needed */}
          <Route path="/group/:id" element={<GroupDetail />} />

          {/* Protected */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

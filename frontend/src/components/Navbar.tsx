// src/components/Navbar.tsx
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 bg-dark/80 backdrop-blur-md border-b border-dark-300">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-lg font-bold tracking-tight text-gray-100 hover:text-accent-green transition-colors"
        >
          Split<span className="text-accent-green">Wise</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 hidden sm:inline">
            {user?.email}
          </span>
          <button
            onClick={() => navigate("/profile")}
            className="btn-ghost text-sm"
          >
            Perfil
          </button>
          <button onClick={handleLogout} className="btn-ghost text-sm">
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  );
}

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
    <nav className="sticky top-0 z-50 bg-dark/95 backdrop-blur-md border-b border-sky-300">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-lg font-bold tracking-tight text-white hover:text-sky-100 transition-colors"
        >
          Junta<span className="text-sky-200">Cuentas</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-sky-100/80 hidden sm:inline">
            {user?.email}
          </span>
          <button
            onClick={() => navigate("/profile")}
            className="text-amber-200 border border-amber-300/50 hover:text-amber-100 hover:bg-amber-300/15 font-medium text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            Perfil
          </button>
          <button onClick={handleLogout} className="bg-amber-300 text-sky-950 hover:bg-amber-200 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  );
}

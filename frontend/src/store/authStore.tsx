// src/store/authStore.tsx — Auth context with useReducer + localStorage persistence
import {
  createContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";
import type { AuthUser } from "../types";

// ── State ────────────────────────────────────────────────────────────────
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ── Actions ──────────────────────────────────────────────────────────────
type AuthAction =
  | { type: "LOGIN"; payload: { user: AuthUser; token: string } }
  | { type: "LOGOUT" };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
      return {
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
      };
    case "LOGOUT":
      return { user: null, token: null, isAuthenticated: false };
    default:
      return state;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────
function loadInitialState(): AuthState {
  const token = localStorage.getItem("access_token");
  const userRaw = localStorage.getItem("user");
  if (token && userRaw) {
    try {
      const user: AuthUser = JSON.parse(userRaw);
      return { user, token, isAuthenticated: true };
    } catch {
      return { user: null, token: null, isAuthenticated: false };
    }
  }
  return { user: null, token: null, isAuthenticated: false };
}

// ── Context ──────────────────────────────────────────────────────────────
interface AuthContextValue {
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, loadInitialState);

  // Persist to localStorage on every state change
  useEffect(() => {
    if (state.isAuthenticated && state.token && state.user) {
      localStorage.setItem("access_token", state.token);
      localStorage.setItem("user", JSON.stringify(state.user));
    } else {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }
  }, [state]);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

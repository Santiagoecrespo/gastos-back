// src/hooks/useAuth.ts — Hook that exposes auth state + login/logout actions
import { useContext, useCallback } from "react";
import { AuthContext } from "../store/authStore";
import type { AuthUser } from "../types";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { state, dispatch } = context;

  const login = useCallback(
    (user: AuthUser, token: string) => {
      dispatch({ type: "LOGIN", payload: { user, token } });
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
  }, [dispatch]);

  return {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    login,
    logout,
  };
}

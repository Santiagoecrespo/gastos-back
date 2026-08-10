// src/services/auth.service.ts
import client from "../api/client";
import type { AuthResponse, AuthUser, EmailAccessResponse, UserProfile } from "../types";

export async function requestEmailCode(email: string, mpAlias?: string): Promise<void> {
  await client.post("/auth/request-code", {
    email,
    mp_alias: mpAlias?.trim() || null,
  });
}

export async function verifyEmailCode(
  email: string,
  code: string
): Promise<{ token: string; user: AuthUser }> {
  const { data } = await client.post<EmailAccessResponse>("/auth/verify-code", { email, code });
  return { token: data.access_token, user: data.user };
}

export async function registerUser(
  email: string,
  password: string,
  mpAlias?: string
): Promise<AuthUser> {
  const { data } = await client.post<AuthUser>("/auth/signup", {
    email,
    password,
    mp_alias: mpAlias || null,
  });
  return data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);

  const { data } = await client.post<AuthResponse>("/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const payload = JSON.parse(atob(data.access_token.split(".")[1]));
  const user: AuthUser = { id: payload.sub, email };

  return { token: data.access_token, user };
}

export async function updateProfile(mpAlias: string | null): Promise<UserProfile> {
  const { data } = await client.patch<UserProfile>("/auth/profile", { mp_alias: mpAlias });
  return data;
}

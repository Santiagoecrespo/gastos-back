// src/services/auth.service.ts
import client from "../api/client";
import type { AuthResponse, AuthUser } from "../types";

export async function registerUser(
  email: string,
  password: string
): Promise<AuthUser> {
  const { data } = await client.post<AuthUser>("/auth/signup", {
    email,
    password,
  });
  return data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  // FastAPI OAuth2PasswordRequestForm expects form-encoded data
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);

  const { data } = await client.post<AuthResponse>("/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  // Decode the JWT payload to extract user info (sub = user id)
  const payload = JSON.parse(atob(data.access_token.split(".")[1]));
  const user: AuthUser = { id: payload.sub, email };

  return { token: data.access_token, user };
}

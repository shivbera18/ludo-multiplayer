import type { AuthResponse, AuthUser } from '../types';

interface AuthPayload {
  username: string;
  displayName?: string;
  password: string;
}

async function parseJsonResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }
  return body;
}

export async function registerAccount(apiBaseUrl: string, payload: AuthPayload): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: payload.username,
      displayName: payload.displayName,
      password: payload.password
    })
  });

  return parseJsonResponse(response) as Promise<AuthResponse>;
}

export async function loginAccount(apiBaseUrl: string, payload: AuthPayload): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: payload.username, password: payload.password })
  });

  return parseJsonResponse(response) as Promise<AuthResponse>;
}

export async function fetchMe(apiBaseUrl: string, token: string): Promise<AuthUser> {
  const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const parsed = await parseJsonResponse(response);
  return parsed.user as AuthUser;
}

const SESSION_KEY = "ember_simple_auth-session";

function readAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      authenticated?: { data?: { accessToken?: string } };
    };
    return parsed?.authenticated?.data?.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = readAccessToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export async function authFetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T | null> {
  const res = await authFetch(input, init);
  if (res.status === 401 || res.status === 403) {
    return null;
  }
  if (!res.ok) {
    throw new Error(
      `Request failed: ${String(res.status)} ${input.toString()}`,
    );
  }
  return (await res.json()) as T;
}

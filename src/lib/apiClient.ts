/**
 * Fetch wrapper that attaches LOCAL_API_SECRET when stored in sessionStorage.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  if (typeof window !== 'undefined') {
    const secret = sessionStorage.getItem('LOCAL_API_SECRET');
    if (secret) {
      headers.set('Authorization', `Bearer ${secret}`);
    }
  }

  return fetch(input, { ...init, headers });
}

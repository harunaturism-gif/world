const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export const useDevelopmentPersistence = import.meta.env.DEV
  && import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';

export async function persistenceRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${backendUrl}/api/persistence${path}`, {
    ...init,
    credentials: 'include',
    headers: init.body === undefined
      ? init.headers
      : { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) throw new Error(`Persistence request failed (${response.status})`);
  return response.json() as Promise<T>;
}

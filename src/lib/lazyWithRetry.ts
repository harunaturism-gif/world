import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RETRY_KEY_PREFIX = 'human-world:chunk-retry:';
const RETRY_GUARD_MS = 10_000;
const CHUNK_LOAD_ERROR = /(?:chunkloaderror|failed to fetch dynamically imported module|importing a module script failed|loading (?:css )?chunk \d+ failed)/i;

type ComponentModule<Props> = {
  default: ComponentType<Props>;
};

function retryKey(chunkName: string) {
  return `${RETRY_KEY_PREFIX}${chunkName}`;
}

function hasRetried(chunkName: string) {
  try {
    const retryAt = Number(window.sessionStorage.getItem(retryKey(chunkName)));
    if (!Number.isFinite(retryAt) || Date.now() - retryAt > RETRY_GUARD_MS) {
      window.sessionStorage.removeItem(retryKey(chunkName));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function markRetry(chunkName: string) {
  try {
    window.sessionStorage.setItem(retryKey(chunkName), String(Date.now()));
  } catch {
    // Reloading still gives the browser one chance to resolve a stale deployment.
  }
}

function clearRetry(chunkName: string) {
  try {
    window.sessionStorage.removeItem(retryKey(chunkName));
  } catch {
    // Storage can be unavailable in privacy-focused browsing modes.
  }
}

export function isChunkLoadError(error: unknown) {
  if (error instanceof Error) return CHUNK_LOAD_ERROR.test(`${error.name} ${error.message}`);
  return typeof error === 'string' && CHUNK_LOAD_ERROR.test(error);
}

export function lazyWithRetry<Props>(
  chunkName: string,
  loader: () => Promise<ComponentModule<Props>>,
): LazyExoticComponent<ComponentType<Props>> {
  return lazy(async () => {
    try {
      const module = await loader();
      clearRetry(chunkName);
      return module;
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error) && !hasRetried(chunkName)) {
        markRetry(chunkName);
        window.location.reload();
        return new Promise<ComponentModule<Props>>(() => undefined);
      }

      throw error;
    }
  });
}

import { useState, useEffect } from 'react';

export function navigateTo(path: string, options?: { replace?: boolean }) {
  if (window.location.pathname === path && !options?.replace) return;
  if (options?.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function getCurrentRoute(): string {
  const path = window.location.pathname.toLowerCase();
  if (path === '' || path === '/') return '/';
  if (path === '/signin' || path.startsWith('/signin')) return '/signin';
  if (path === '/register' || path.startsWith('/register')) return '/register';
  if (path === '/workspace' || path.startsWith('/workspace')) return '/workspace';
  return '*'; // 404 unknown route
}

export function useCurrentRoute(): string {
  const [route, setRoute] = useState<string>(getCurrentRoute);

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(getCurrentRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  return route;
}

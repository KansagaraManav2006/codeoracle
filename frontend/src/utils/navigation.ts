import React, { useState, useEffect } from 'react';

export const ROUTE_TITLES: Record<string, string> = {
  '/': 'CodeOracle | Legacy Codebase Intelligence & Modernization Engine',
  '/workspace': 'CodeOracle | Workspace',
  '/signin': 'Sign In | CodeOracle',
  '/register': 'Create Account | CodeOracle',
  '*': 'Page Not Found | CodeOracle',
};

/**
 * Updates document.title and shifts focus to the primary heading or main container.
 */
export function updateRouteA11y(route: string, customTitle?: string) {
  const title = customTitle || ROUTE_TITLES[route] || 'CodeOracle';
  document.title = title;

  // Defer focus slightly so React commits the new view DOM
  requestAnimationFrame(() => {
    const heading = document.querySelector('h1');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
      }
      heading.focus({ preventScroll: true });
    } else {
      const main = document.getElementById('main-content');
      if (main) {
        if (!main.hasAttribute('tabindex')) {
          main.setAttribute('tabindex', '-1');
        }
        main.focus({ preventScroll: true });
      }
    }
  });
}

export function navigateTo(path: string, options?: { replace?: boolean; title?: string }) {
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
      const newRoute = getCurrentRoute();
      setRoute(newRoute);
      updateRouteA11y(newRoute);
    };

    // Initialize title and focus on mount
    updateRouteA11y(getCurrentRoute());

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  return route;
}

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  replace?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Semantic Link component that preserves native <a> tag SEO/screen-reader semantics
 * and modifier clicks (ctrl/cmd/middle-click) while performing fast client-side navigation.
 */
export const Link: React.FC<LinkProps> = ({
  href,
  replace = false,
  className,
  children,
  onClick,
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      navigateTo(href, { replace });
    }
  };

  return React.createElement(
    'a',
    {
      href,
      onClick: handleClick,
      className,
      ...rest,
    },
    children
  );
};

import { useEffect, useState, useRef, RefObject } from 'react';

// ─── Reduced Motion ────────────────────────────────────────────────────────────

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

// ─── In-View Observer ─────────────────────────────────────────────────────────

interface InViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useInView(options: InViewOptions = {}): [RefObject<HTMLDivElement>, boolean] {
  const { threshold = 0.15, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.unobserve(el);
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, inView];
}

// ─── Full Page Scroll Progress (for sticky pinned sections) ───────────────────

interface ScrollProgressOptions {
  offset?: [number, number];
}

export function useScrollProgress(_options: ScrollProgressOptions = {}): [RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalDistance = rect.height - windowHeight;

      if (totalDistance <= 0) {
        setProgress(1);
        ticking = false;
        return;
      }

      const current = -rect.top;
      const raw = Math.min(Math.max(current / totalDistance, 0), 1);
      setProgress(raw);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return [ref, progress];
}

// ─── Section Viewport Progress ─────────────────────────────────────────────────
// Progress 0→1 as the section travels from "just entered viewport" to "fully scrolled past"
// Useful for scroll-gating individual reveals within a section

export function useSectionScrollProgress(): [RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;

      // 0 when top of section is at bottom of viewport
      // 1 when bottom of section is at top of viewport
      const totalTravel = rect.height + windowH;
      const traveled = windowH - rect.top;
      const raw = Math.min(Math.max(traveled / totalTravel, 0), 1);
      setProgress(raw);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return [ref, progress];
}

// ─── Parallax Offset ──────────────────────────────────────────────────────────
// Returns a Y offset in px based on scroll position + a speed multiplier.

export function useParallaxOffset(speed: number = 0.1): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    let ticking = false;
    const update = () => {
      setOffset(window.scrollY * speed);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, [speed]);

  return offset;
}

// ─── Count-Up Animation ───────────────────────────────────────────────────────

export function useCountUp(target: number, active: boolean, duration = 800): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const from = 0;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(from + (target - from) * ease));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, active, duration]);

  return value;
}

// ─── Stagger Visible (trigger each item individually) ─────────────────────────

export function useStaggerVisible(count: number, inView: boolean, delayMs = 120): boolean[] {
  const [visibles, setVisibles] = useState<boolean[]>(Array(count).fill(false));
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!inView) return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    for (let i = 0; i < count; i++) {
      const t = setTimeout(() => {
        setVisibles(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, i * delayMs);
      timersRef.current.push(t);
    }

    return () => timersRef.current.forEach(clearTimeout);
  }, [inView, count, delayMs]);

  return visibles;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function interpolate(
  progress: number,
  inputRange: [number, number],
  outputRange: [number, number]
): number {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  if (progress <= inMin) return outMin;
  if (progress >= inMax) return outMax;
  const ratio = (progress - inMin) / (inMax - inMin);
  return outMin + ratio * (outMax - outMin);
}

// Premium easing functions
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── useScrollY (simple scroll position) ─────────────────────────────────────

export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    let ticking = false;
    const handle = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return scrollY;
}

// ─── useInViewRef (overload with generic element type) ────────────────────────

export function useInViewElement<T extends Element>(options: InViewOptions = {}): [RefObject<T>, boolean] {
  const { threshold = 0.15, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) observer.unobserve(el);
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, inView];
}

// ─── useScrollReveal (Zoom-in card & section reveal) ──────────────────────────

export interface ScrollRevealHookOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
  duration?: number;
  variant?: 'card' | 'slide-up' | 'slide-left' | 'fade';
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealHookOptions = {}
): {
  ref: RefObject<T>;
  inView: boolean;
  style: React.CSSProperties;
} {
  const {
    threshold = 0.12,
    rootMargin = '0px 0px -40px 0px',
    triggerOnce = true,
    delay = 0,
    duration = 500,
    variant = 'card',
  } = options;

  const [ref, inView] = useInViewElement<T>({ threshold, rootMargin, triggerOnce });
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return { ref, inView: true, style: {} };
  }

  let initialTransform = 'scale(0.93) translate3d(0, 20px, 0)';
  if (variant === 'slide-up') {
    initialTransform = 'translate3d(0, 28px, 0)';
  } else if (variant === 'slide-left') {
    initialTransform = 'translate3d(32px, 0, 0)';
  } else if (variant === 'fade') {
    initialTransform = 'none';
  }

  const style: React.CSSProperties = {
    opacity: inView ? 1 : 0,
    transform: inView ? 'scale(1) translate3d(0, 0, 0)' : initialTransform,
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    willChange: 'opacity, transform',
  };

  return { ref, inView, style };
}


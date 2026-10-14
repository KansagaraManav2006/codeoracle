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

// ─── Shared Passive Scroll & Resize Listener ──────────────────────────────────
type SharedScrollCallback = () => void;
const scrollCallbacks = new Set<SharedScrollCallback>();
let sharedScrollTicking = false;

function onSharedScrollTick() {
  if (!sharedScrollTicking) {
    sharedScrollTicking = true;
    requestAnimationFrame(() => {
      scrollCallbacks.forEach((cb) => cb());
      sharedScrollTicking = false;
    });
  }
}

export function subscribeSharedScroll(cb: SharedScrollCallback): () => void {
  if (scrollCallbacks.size === 0 && typeof window !== 'undefined') {
    window.addEventListener('scroll', onSharedScrollTick, { passive: true });
    window.addEventListener('resize', onSharedScrollTick, { passive: true });
  }
  scrollCallbacks.add(cb);
  return () => {
    scrollCallbacks.delete(cb);
    if (scrollCallbacks.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('scroll', onSharedScrollTick);
      window.removeEventListener('resize', onSharedScrollTick);
    }
  };
}

// ─── Shared IntersectionObserver Pool ──────────────────────────────────────────
type InViewCallback = (entry: IntersectionObserverEntry) => void;
const observerPool = new Map<
  string,
  { observer: IntersectionObserver; callbacks: Map<Element, InViewCallback> }
>();

function observeSharedElement(
  el: Element,
  threshold: number,
  rootMargin: string,
  cb: InViewCallback
): () => void {
  const key = `${threshold}:${rootMargin}`;
  let pool = observerPool.get(key);
  if (!pool) {
    const callbacks = new Map<Element, InViewCallback>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const fn = callbacks.get(entry.target);
          fn?.(entry);
        });
      },
      { threshold, rootMargin }
    );
    pool = { observer, callbacks };
    observerPool.set(key, pool);
  }

  pool.callbacks.set(el, cb);
  pool.observer.observe(el);

  return () => {
    const p = observerPool.get(key);
    if (p) {
      p.callbacks.delete(el);
      p.observer.unobserve(el);
    }
  };
}

// ─── In-View Observer ─────────────────────────────────────────────────────────

interface InViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useInView(options: InViewOptions = {}): [RefObject<HTMLDivElement>, boolean] {
  return useInViewElement<HTMLDivElement>(options);
}

export function useInViewElement<T extends Element>(
  options: InViewOptions = {}
): [RefObject<T>, boolean] {
  const { threshold = 0.15, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let unobserve: (() => void) | undefined;
    unobserve = observeSharedElement(el, threshold, rootMargin, (entry) => {
      if (entry.isIntersecting) {
        setInView(true);
        if (triggerOnce && unobserve) {
          unobserve();
        }
      } else if (!triggerOnce) {
        setInView(false);
      }
    });

    return () => {
      unobserve?.();
    };
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
    const update = () => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalDistance = rect.height - windowHeight;

      if (totalDistance <= 0) {
        setProgress(1);
        return;
      }

      const current = -rect.top;
      const raw = Math.min(Math.max(current / totalDistance, 0), 1);
      setProgress(raw);
    };

    update();
    return subscribeSharedScroll(update);
  }, []);

  return [ref, progress];
}

// ─── Section Viewport Progress ─────────────────────────────────────────────────

export function useSectionScrollProgress(): [RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;

      const totalTravel = rect.height + windowH;
      const traveled = windowH - rect.top;
      const raw = Math.min(Math.max(traveled / totalTravel, 0), 1);
      setProgress(raw);
    };

    update();
    return subscribeSharedScroll(update);
  }, []);

  return [ref, progress];
}

// ─── Parallax Offset ──────────────────────────────────────────────────────────

export function useParallaxOffset(speed: number = 0.1): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const update = () => {
      setOffset(window.scrollY * speed);
    };

    update();
    return subscribeSharedScroll(update);
  }, [speed]);

  return offset;
}

// ─── useScrollY ──────────────────────────────────────────────────────────────

export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const update = () => {
      setScrollY(window.scrollY);
    };

    update();
    return subscribeSharedScroll(update);
  }, []);

  return scrollY;
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
        setVisibles((prev) => {
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

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

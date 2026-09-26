import React, { useRef, useState, useEffect } from 'react';
import { useReducedMotion } from '../../hooks/useScrollAnimation';

export interface ScrollRevealProps {
  children: React.ReactNode;
  variant?: 'card' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'fade';
  delay?: number; // milliseconds
  duration?: number; // milliseconds
  threshold?: number;
  rootMargin?: string;
  className?: string;
  triggerOnce?: boolean;
  as?: React.ElementType;
  style?: React.CSSProperties;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  variant = 'card',
  delay = 0,
  duration = 500,
  threshold = 0.12,
  rootMargin = '0px 0px -40px 0px',
  className = '',
  triggerOnce = true,
  as: Component = 'div',
  style = {},
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      setInView(true);
      return;
    }

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
  }, [threshold, rootMargin, triggerOnce, prefersReduced]);

  if (prefersReduced) {
    return (
      <Component ref={ref} className={className} style={style}>
        {children}
      </Component>
    );
  }

  // Initial vs Revealed Transforms
  let initialTransform = 'translate3d(0, 24px, 0)';
  if (variant === 'card') {
    // Zoom-in (scale up) + slide-up + fade
    initialTransform = 'scale(0.93) translate3d(0, 20px, 0)';
  } else if (variant === 'slide-up') {
    initialTransform = 'translate3d(0, 28px, 0)';
  } else if (variant === 'slide-down') {
    initialTransform = 'translate3d(0, -28px, 0)';
  } else if (variant === 'slide-left') {
    initialTransform = 'translate3d(32px, 0, 0)';
  } else if (variant === 'slide-right') {
    initialTransform = 'translate3d(-32px, 0, 0)';
  } else if (variant === 'fade') {
    initialTransform = 'none';
  }

  const animationStyle: React.CSSProperties = {
    opacity: inView ? 1 : 0,
    transform: inView ? 'scale(1) translate3d(0, 0, 0)' : initialTransform,
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    willChange: 'opacity, transform',
    ...style,
  };

  return (
    <Component ref={ref} className={`${className} transform-gpu`} style={animationStyle}>
      {children}
    </Component>
  );
};

export default ScrollReveal;

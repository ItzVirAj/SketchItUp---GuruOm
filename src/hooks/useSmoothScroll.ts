import React, { useEffect, useRef } from 'react';
import Lenis from 'lenis';

interface SmoothScrollOptions {
  duration?: number;
  wheelMultiplier?: number;
  touchMultiplier?: number;
}

/**
 * Checks if the current client environment is a touch device or mobile viewport.
 * On mobile/touch devices, native hardware-accelerated momentum scrolling is optimal.
 */
function isTouchOrMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.innerWidth < 1024
  );
}

/**
 * Custom hook to initialize butter-smooth, eased inertial scrolling with Lenis on desktop.
 * On mobile / touch screens, gracefully falls back to native 120Hz compositor momentum scrolling.
 */
export function useSmoothScroll(
  containerRef?: React.RefObject<HTMLElement | null>,
  deps: any[] = [],
  options: SmoothScrollOptions = {}
) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // If running on a touch device or mobile screen, do NOT hijack touch events with JS loops.
    // Native touch scrolling runs at 120Hz on the GPU compositor thread without JS overhead.
    if (isTouchOrMobileDevice()) {
      return;
    }

    const isCustomContainer = !!containerRef?.current;
    const targetElement = isCustomContainer ? containerRef.current : undefined;

    const lenis = new Lenis({
      wrapper: targetElement || undefined,
      content: targetElement ? (targetElement.firstElementChild as HTMLElement) || undefined : undefined,
      duration: options.duration ?? 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: options.wheelMultiplier ?? 0.9,
      touchMultiplier: 0,
      infinite: false,
      prevent: (node: HTMLElement) => {
        if (!node) return false;
        return Boolean(
          node.closest?.('[data-lenis-prevent]') ||
          node.closest?.('[role="dialog"]') ||
          node.closest?.('[aria-modal="true"]') ||
          node.closest?.('.fixed.inset-0') ||
          node.closest?.('.modal-overlay') ||
          node.closest?.('.modal-container')
        );
      },
    });

    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    let resizeTimer: any = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isTouchOrMobileDevice()) {
          lenis.destroy();
          lenisRef.current = null;
        } else {
          lenis.resize();
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [containerRef?.current, ...deps]);

  // Provide method to manually scrollTo
  const scrollTo = (target: number | string | HTMLElement, opts?: any) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, opts);
    } else if (containerRef?.current) {
      if (typeof target === 'number') {
        containerRef.current.scrollTo({ top: target, behavior: 'smooth' });
      } else if (typeof target === 'object' && target !== null && 'offsetTop' in target) {
        containerRef.current.scrollTo({ top: (target as HTMLElement).offsetTop, behavior: 'smooth' });
      }
    } else if (typeof window !== 'undefined') {
      if (typeof target === 'number') {
        window.scrollTo({ top: target, behavior: 'smooth' });
      }
    }
  };

  return { lenis: lenisRef.current, scrollTo };
}

export default useSmoothScroll;


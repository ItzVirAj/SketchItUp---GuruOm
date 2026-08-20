import React, { useEffect, useRef } from 'react';
import Lenis from 'lenis';

interface SmoothScrollOptions {
  duration?: number;
  wheelMultiplier?: number;
  touchMultiplier?: number;
}

/**
 * Custom hook to initialize butter-smooth, eased inertial scrolling with Lenis.
 * Supports both window-level and container-level smooth scrolling.
 * Automatically locks background scrolling when any modal/dialog is open.
 */
export function useSmoothScroll(
  containerRef?: React.RefObject<HTMLElement | null>,
  deps: any[] = [],
  options: SmoothScrollOptions = {}
) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const isCustomContainer = !!containerRef?.current;
    const targetElement = isCustomContainer ? containerRef.current : undefined;

    const lenis = new Lenis({
      wrapper: targetElement || undefined,
      content: targetElement ? (targetElement.firstElementChild as HTMLElement) || undefined : undefined,
      duration: options.duration ?? 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: options.wheelMultiplier ?? 0.85,
      touchMultiplier: options.touchMultiplier ?? 1.2,
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

    const handleResize = () => {
      lenis.resize();
    };

    window.addEventListener('resize', handleResize);

    // Modal scroll locking observer
    const checkModalState = () => {
      const modalElements = document.querySelectorAll(
        '.fixed.inset-0.z-50, [role="dialog"], [aria-modal="true"], .modal-overlay, .modal-container'
      );
      const isModalOpen = modalElements.length > 0;
      if (isModalOpen) {
        modalElements.forEach(el => {
          if (!el.hasAttribute('data-lenis-prevent')) {
            el.setAttribute('data-lenis-prevent', 'true');
          }
        });
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        lenis.stop();
      } else {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        lenis.start();
      }
    };

    const observer = new MutationObserver(() => {
      checkModalState();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    checkModalState();

    return () => {
      observer.disconnect();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [containerRef?.current, ...deps]);

  // Provide method to manually scrollTo
  const scrollTo = (target: number | string | HTMLElement, opts?: any) => {
    lenisRef.current?.scrollTo(target, opts);
  };

  return { lenis: lenisRef.current, scrollTo };
}

export default useSmoothScroll;

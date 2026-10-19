'use client';

import React, { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'motion/react';
import styles from './animated-counter.module.css';

export interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  animateOnView?: boolean;
  className?: string;
  formatNumber?: (val: number) => string;
}

function defaultFormatter(val: number): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '-';
  const hasDecimals = Math.abs(val % 1) > 0.001;
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: hasDecimals ? 1 : 0,
  }).format(hasDecimals ? Math.round(val * 10) / 10 : Math.round(val));
}

function useSafeInView(ref: React.RefObject<HTMLSpanElement | null>, enabled: boolean) {
  const [isInView, setIsInView] = useState(() => typeof IntersectionObserver === 'undefined' || !enabled);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, enabled]);

  return isInView;
}

export function AnimatedCounter({
  value,
  suffix,
  prefix,
  animateOnView = false,
  className = '',
  formatNumber = defaultFormatter,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useSafeInView(ref, animateOnView);
  const reduceMotion = !!useReducedMotion();
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  const safeValue = Number.isFinite(value) ? value : 0;
  const count = useMotionValue(safeValue);
  const [display, setDisplay] = useState(() => formatNumber(safeValue));
  const prevValueRef = useRef(safeValue);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const from = hasAnimatedRef.current ? prevValueRef.current : 0;
    prevValueRef.current = safeValue;

    if (reduceMotion || isTest) {
      count.set(safeValue);
      setDisplay(formatNumber(safeValue));
      return;
    }

    if (animateOnView && !isInView && !hasAnimatedRef.current) {
      count.set(safeValue);
      setDisplay(formatNumber(safeValue));
      return;
    }

    hasAnimatedRef.current = true;
    count.set(from);

    const controls = animate(count, safeValue, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplay(formatNumber(latest));
      },
    });

    return () => controls.stop();
  }, [safeValue, isInView, animateOnView, reduceMotion, isTest, formatNumber, count]);

  return (
    <span ref={ref} className={`${styles.counter} ${className} tabular-nums`}>
      {prefix && <span className={styles.prefix}>{prefix}</span>}
      <span className={styles.value}>{display}</span>
      {suffix && <span className={styles.suffix}>{suffix}</span>}
    </span>
  );
}

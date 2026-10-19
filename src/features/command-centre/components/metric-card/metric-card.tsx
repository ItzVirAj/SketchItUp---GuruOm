'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type Variants } from 'motion/react';
import { motionTokens } from '@/lib/motion-tokens';
import { AnimatedCounter } from '../animated-counter/animated-counter';
import styles from './metric-card.module.css';

export interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  context: string;
  change?: string;
  icon?: React.ReactNode;
  sparkline?: number[];
  href?: string;
  onOpen?: () => void;
  className?: string;
  note?: string;
}

/** Copy that holds a number enters from the side it moved toward: a larger value rises from below, a smaller one drops from above. */
const rise: Variants = {
  hidden: (direction: number) => ({
    opacity: 0,
    y: `${0.3 * direction}em`,
    filter: `blur(${motionTokens.blur.soft}px)`,
  }),
  shown: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: motionTokens.duration.standard,
      ease: motionTokens.ease.enter,
    },
  },
  gone: (direction: number) => ({
    opacity: 0,
    y: `${-0.3 * direction}em`,
    filter: `blur(${motionTokens.blur.subtle}px)`,
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.ease.standard,
    },
  }),
};

const fade: Variants = {
  hidden: { opacity: 0, y: 0, filter: 'blur(0px)' },
  shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: motionTokens.duration.instant } },
  gone: { opacity: 0, y: 0, filter: 'blur(0px)', transition: { duration: motionTokens.duration.instant } },
};

const amountIn = (text: string) => Number(text.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)?.[0] ?? NaN);

/** New copy rises in while the old copy leaves; `morph` springs the wrapper to the new text's width instead of letting it snap. */
export function Swap({ text, morph = false, block = false }: { text: string; morph?: boolean; block?: boolean }) {
  const reduceMotion = !!useReducedMotion();
  const sizer = useRef<HTMLSpanElement>(null);
  const width = useMotionValue<number | 'auto'>('auto');
  const [shown, setShown] = useState({ text, direction: 1 });
  if (shown.text !== text) setShown({ text, direction: amountIn(text) < amountIn(shown.text) ? -1 : 1 });

  useEffect(() => {
    const node = sizer.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    let measured: string | null = null;
    // Layout size, not the transformed rect, so a scaling parent never leaves the text clipped. Only a new text springs; font loads jump.
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = entry.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth;
      if (next && measured !== null && measured !== node.textContent && !reduceMotion) {
        animate(width, next, motionTokens.spring.morph);
      } else {
        width.jump(next || 'auto');
      }
      measured = next ? node.textContent : null;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [morph, reduceMotion, width]);

  return (
    <motion.span className={block ? styles.swapBlock : styles.swap} style={morph ? { width } : undefined}>
      {morph && <span ref={sizer} className={styles.sizer} aria-hidden="true">{text}</span>}
      <AnimatePresence mode="popLayout" initial={false} custom={shown.direction}>
        <motion.span
          key={text}
          className={styles.text}
          custom={shown.direction}
          variants={reduceMotion ? fade : rise}
          initial="hidden"
          animate="shown"
          exit="gone"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((val, index) => {
    const x = (index / (values.length - 1)) * 48;
    const y = 17 - ((val - min) / span) * 13;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className={styles.sparkline} viewBox="0 0 48 18" role="img" aria-label="Period trend">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  suffix,
  prefix,
  context,
  change,
  icon,
  sparkline,
  href,
  onOpen,
  className,
  note,
}: MetricCardProps) {
  const reduceMotion = !!useReducedMotion();
  return (
    <article
      className={`${styles.card} ${className || ''} ${onOpen ? styles.clickable : ''}`}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); } : undefined}
    >
      <div className={styles.top}>
        <span className={styles.labelGroup}>
          {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
          <Swap text={label} block />
        </span>
        <div className={styles.topRight}>
          <AnimatePresence initial={false}>
            {change && (
              <motion.small
                key="change"
                data-trend={/^[+]/.test(change) ? 'up' : /^[-−]/.test(change) ? 'down' : undefined}
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: reduceMotion ? 1 : 0.96,
                  transition: { duration: motionTokens.duration.fast, ease: motionTokens.ease.standard },
                }}
                transition={reduceMotion ? { duration: 0 } : motionTokens.spring.snappy}
              >
                <Swap text={change} morph />
              </motion.small>
            )}
          </AnimatePresence>
          {href && (
            <button
              type="button"
              className={styles.viewLink}
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.();
              }}
            >
              View
            </button>
          )}
        </div>
      </div>
      <div className={styles.valueRow}>
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} animateOnView />
        {sparkline && sparkline.length > 1 && <Sparkline values={sparkline} />}
      </div>
      <div className={styles.foot}>
        <p><Swap text={context} block /></p>
        {note && <span className={styles.note}>{note}</span>}
      </div>
    </article>
  );
}

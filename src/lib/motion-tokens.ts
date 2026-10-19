export const motionTokens = {
  duration: {
    instant: 0,
    fast: 0.16,
    standard: 0.28,
    considered: 0.52,
    slow: 0.44,
  },
  ease: {
    enter: [0.16, 1, 0.3, 1] as [number, number, number, number],
    exit: [0.4, 0, 1, 1] as [number, number, number, number],
    standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
    inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  blur: {
    none: 0,
    subtle: 2,
    soft: 4,
    strong: 8,
  },
  spring: {
    morph: { type: 'spring' as const, stiffness: 350, damping: 30, visualDuration: 0.4, bounce: 0 },
    snappy: { type: 'spring' as const, stiffness: 420, damping: 28, visualDuration: 0.35, bounce: 0.1 },
    smooth: { type: 'spring' as const, stiffness: 300, damping: 30, visualDuration: 0.5, bounce: 0.05 },
    gentle: { type: 'spring' as const, stiffness: 200, damping: 24, visualDuration: 0.6, bounce: 0.05 },
  },
  stagger: {
    item: 0.04,
    fast: 0.02,
    standard: 0.05,
  },
};

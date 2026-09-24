import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface AuthTransitionScreenProps {
  mode?: 'logout' | 'connecting';
  isDarkMode?: boolean;
}

export const AuthTransitionScreen: React.FC<AuthTransitionScreenProps> = ({
  mode = 'connecting',
  isDarkMode = true,
}) => {
  const reduceMotion = useReducedMotion();
  const isLogout = mode === 'logout';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative flex h-screen w-full flex-col items-center justify-center overflow-hidden font-sans select-none ${
        isDarkMode ? 'bg-[#070709] text-white' : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute h-[380px] w-[380px] rounded-full blur-[100px] ${
          isDarkMode ? 'bg-[#4d8eff]/12' : 'bg-[#4d8eff]/10'
        }`}
      />

      {/* Floating Apple-style glassmorphic card */}
      <div
        className={`relative z-10 flex w-full max-w-[340px] flex-col items-center rounded-3xl border p-8 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? 'border-white/10 bg-[#121216]/75 shadow-[0_25px_60px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.12)]'
            : 'border-slate-200/80 bg-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)]'
        }`}
      >
        {/* Emblem */}
        <div
          className={`relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border p-2 shadow-inner ${
            isDarkMode
              ? 'border-white/10 bg-white/[0.04]'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <img
            src="/logo.png"
            alt="GuruOm"
            className="h-9 w-9 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Status text */}
        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
          {isLogout ? 'Signing out…' : 'Connecting to OwnerOS…'}
        </h2>
        <p
          className={`mt-1 text-center text-[12.5px] leading-normal ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {isLogout
            ? 'Closing session securely'
            : 'Verifying workspace session'}
        </p>

        {/* Apple-style harmonic 3-dot pulse cluster */}
        <div className="mt-6 flex items-center justify-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-[#4d8eff] shadow-[0_0_8px_rgba(77,142,255,0.7)]"
              initial={
                reduceMotion
                  ? { opacity: 0.9, scale: 1 }
                  : { opacity: 0.35, scale: 0.75 }
              }
              animate={
                reduceMotion
                  ? { opacity: 0.9, scale: 1 }
                  : {
                      opacity: [0.35, 1, 0.35],
                      scale: [0.75, 1.25, 0.75],
                    }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.18,
                      ease: 'easeInOut',
                    }
              }
            />
          ))}
        </div>

        {/* Specular hairline light track */}
        <div
          aria-hidden="true"
          className={`relative mt-5 h-[2px] w-28 overflow-hidden rounded-full ${
            isDarkMode ? 'bg-white/10' : 'bg-slate-200'
          }`}
        >
          {!reduceMotion && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4d8eff] to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                ease: 'easeInOut',
              }}
            />
          )}
        </div>

        {/* Workspace watermark badge */}
        <span
          className={`mt-6 text-[10px] font-medium tracking-wider uppercase ${
            isDarkMode ? 'text-white/30' : 'text-slate-400'
          }`}
        >
          GuruOm Industries
        </span>
      </div>
    </div>
  );
};

export default AuthTransitionScreen;

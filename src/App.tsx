import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ConsoleContainer } from './components/console/ConsoleContainer';
import { ServerAdminVault } from './components/admin/ServerAdminVault';
import { LoginPage } from './components/auth/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccentThemeProvider } from './context/AccentThemeContext';
import { ToastProvider } from './context/ToastContext';

import { setDarkModeWithoutTransitions } from './utils/themeTransitions';
import { Agentation } from 'agentation';

import { AuthTransitionScreen } from './components/auth/AuthTransitionScreen';

// Helper component to reset scroll position on page route changes
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function MainApp() {
  const { user, loading, isLoggingOut, signOut } = useAuth();
  const reduceMotion = useReducedMotion();
  const wasUnauthenticatedRef = useRef(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('stratum_darkMode');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      wasUnauthenticatedRef.current = true;
    }
  }, [loading, user]);

  useEffect(() => {
    // Switch instantly (no global transition smear) — see utils/themeTransitions.ts
    setDarkModeWithoutTransitions(isDarkMode);
    localStorage.setItem('stratum_darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const isFreshLogin = wasUnauthenticatedRef.current && Boolean(user);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {loading ? (
        <motion.div
          key="auth-transition-screen"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="h-screen w-full"
        >
          <AuthTransitionScreen
            mode={isLoggingOut ? 'logout' : 'connecting'}
            isDarkMode={isDarkMode}
          />
        </motion.div>
      ) : !user ? (
        <motion.div
          key="login-screen"
          initial={false}
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.985 }
          }
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          <LoginPage
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          />
        </motion.div>
      ) : (
        <motion.div
          key="authenticated-screen"
          initial={
            reduceMotion
              ? { opacity: 0 }
              : isFreshLogin
                ? { opacity: 0, scale: 0.988 }
                : false
          }
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : isFreshLogin
                ? { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0 }
          }
          className="w-full"
          onAnimationComplete={() => {
            wasUnauthenticatedRef.current = false;
          }}
        >
          <Router>
            <ScrollToTop />
            {/* Outer shell: always pure black so the console/admin frame is
                consistent across both themes (inner surfaces stay theme-driven). */}
            <div className="min-h-screen bg-black font-sans text-white">
              <Routes>
                <Route path="/server-admin/*" element={<ServerAdminVault onSignOut={signOut} />} />
                <Route path="/admin-vault/*" element={<ServerAdminVault onSignOut={signOut} />} />
                <Route path="*" element={<ConsoleContainer onSignOut={signOut} />} />
              </Routes>
            </div>
          </Router>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccentThemeProvider>
        <ToastProvider>
          <MainApp />
          {import.meta.env.DEV && <Agentation />}
        </ToastProvider>
      </AccentThemeProvider>
    </AuthProvider>
  );
}




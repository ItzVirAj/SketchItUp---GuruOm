import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ConsoleContainer } from './components/console/ConsoleContainer';
import { LoginPage } from './components/auth/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccentThemeProvider } from './context/AccentThemeContext';
import { ToastProvider } from './context/ToastContext';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { Agentation } from 'agentation';

// Helper component to reset scroll position on page route changes
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function MainApp() {
  const { user, loading, signOut } = useAuth();
  useSmoothScroll(); // Global window-level butter-smooth momentum scroll

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('stratum_darkMode');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('stratum_darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Authenticating with Owner OS...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage 
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <Routes>
          <Route path="*" element={<ConsoleContainer onSignOut={signOut} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccentThemeProvider>
        <ToastProvider>
          <MainApp />
          <Agentation />
        </ToastProvider>
      </AccentThemeProvider>
    </AuthProvider>
  );
}




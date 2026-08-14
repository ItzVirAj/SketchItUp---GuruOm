import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Frontend Allowed Origin for CORS
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000',

  // Database / Supabase Service Secrets (Server Only)
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://txztwjvjqjczxwskzjjx.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',

  // JWT Token Secrets & Durations (Server Only)
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'stratum_owner_os_access_secret_2026_secure_key_32chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'stratum_owner_os_refresh_secret_2026_secure_key_32chars',
  
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN_DAYS: 7,

  // Resend Secrets (Server Only)
  RESEND_API_KEY: process.env.RESEND_API_KEY || ''
};

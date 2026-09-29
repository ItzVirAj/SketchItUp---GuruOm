-- ============================================================================
-- Migration: 050_attendance_device_ip.sql
-- Description: HR Module — Add IP address and Device telemetry columns to attendance_logs
-- ============================================================================

DO $$ 
BEGIN
  -- ip_address column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN ip_address TEXT;
  END IF;

  -- device column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'device'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN device TEXT;
  END IF;

  -- device_type column ('desktop' | 'mobile' | 'tablet' | etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN device_type TEXT;
  END IF;

  -- browser column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'browser'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN browser TEXT;
  END IF;

  -- os column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'os'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN os TEXT;
  END IF;

  -- user_agent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN user_agent TEXT;
  END IF;
END $$;

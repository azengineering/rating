
-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'settings',
    maintenance_active TEXT DEFAULT 'false' CHECK (maintenance_active IN ('true', 'false')),
    maintenance_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.site_settings (id, maintenance_active, maintenance_message) 
VALUES ('settings', 'false', 'We are currently performing maintenance. Please check back later.') 
ON CONFLICT (id) DO NOTHING;

-- Create site_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.site_notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make sure admin_messages table exists with correct structure
CREATE TABLE IF NOT EXISTS public.admin_messages (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    isRead BOOLEAN DEFAULT false,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add any missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS block_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_messages_user_id ON public.admin_messages(userId);
CREATE INDEX IF NOT EXISTS idx_admin_messages_read ON public.admin_messages(isRead);
CREATE INDEX IF NOT EXISTS idx_users_blocked ON public.users(is_blocked);

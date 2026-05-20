-- Create password_reset_tokens table for password reset functionality
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_password_reset_tokens_token_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Enable RLS on password_reset_tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Only token owner can read reset token" ON public.password_reset_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert tokens (created via API)
CREATE POLICY "Allow authenticated users to request password reset" ON public.password_reset_tokens
  FOR INSERT
  WITH CHECK (true);

-- Allow updating tokens (marking as used)
CREATE POLICY "Allow updating password reset tokens" ON public.password_reset_tokens
  FOR UPDATE
  USING (true);

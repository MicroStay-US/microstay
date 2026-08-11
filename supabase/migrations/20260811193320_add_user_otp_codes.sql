CREATE TABLE IF NOT EXISTS public.user_otp_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: We are deliberately NOT adding a 'used' column. 
-- The backend API will securely delete the row upon successful verification to prevent replay attacks.

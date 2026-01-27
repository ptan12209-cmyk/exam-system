-- Migration: Add profile customization fields
-- Add columns for avatar, nickname, bio, and phone to profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add index for faster nickname lookups
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname) WHERE nickname IS NOT NULL;

-- Add check constraint for bio length
ALTER TABLE profiles 
ADD CONSTRAINT check_bio_length CHECK (char_length(bio) <= 200);

-- Add check constraint for nickname length and format
ALTER TABLE profiles 
ADD CONSTRAINT check_nickname_format CHECK (
    nickname IS NULL OR (
        char_length(nickname) >= 3 AND 
        char_length(nickname) <= 20 AND
        nickname ~ '^[a-zA-Z0-9_]+$'
    )
);

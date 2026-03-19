-- Add theme column to profiles table to store persistent theme preferences
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme VARCHAR(50) DEFAULT 'midnight-scholar';

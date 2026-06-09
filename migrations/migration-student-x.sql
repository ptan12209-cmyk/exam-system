-- Migration: Support Student X and exam assignment routing
-- Drop existing nickname constraint if it exists and replace it to support nickname 'X'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_nickname_format;
ALTER TABLE profiles ADD CONSTRAINT check_nickname_format CHECK (
    nickname IS NULL OR (
        char_length(nickname) >= 1 AND 
        char_length(nickname) <= 20 AND
        nickname ~ '^[a-zA-Z0-9_]+$'
    )
);

-- Add assigned_to column to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT 'normal' CHECK (assigned_to IN ('normal', 'x'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_exams_assigned_to ON exams(assigned_to);

-- Seed Account for Student X (Email: X@gmail.com, Password: hotanphat@@@)
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  -- Kiểm tra xem tài khoản đã tồn tại hay chưa
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'X@gmail.com') THEN
    
    -- Tạo tài khoản trong auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'X@gmail.com',
      crypt('hotanphat@@@', gen_salt('bf', 10)), -- Băm mật mã theo định dạng bcrypt mà Supabase sử dụng
      NOW(),
      NULL,
      NULL,
      '{"provider": "email", "providers": ["email"]}',
      '{"role": "student", "full_name": "Học sinh X"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Đăng ký thông tin identity để hiển thị được trên Supabase Dashboard Auth
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      new_user_id,
      json_build_object('sub', new_user_id::text, 'email', 'X@gmail.com'),
      'email',
      NULL,
      NOW(),
      NOW()
    );

    -- Cập nhật nickname 'X' trong profiles (được tạo tự động nhờ trigger handle_new_user)
    UPDATE public.profiles
    SET nickname = 'X', class = '12'
    WHERE id = new_user_id;

  END IF;
END $$;

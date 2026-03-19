# Admin Setup Guide

To promote your account to the **Admin** role, please follow these steps:

### 1. Get your User ID
Log in to your Supabase Dashboard and go to the **Authentication** section. Find your email address and copy the **User ID** (UUID).

### 2. Run the SQL Script
Go to the **SQL Editor** in your Supabase Dashboard and run the following command (replace `'YOUR_USER_ID'` with the UUID you copied):

```sql
-- 1. Promote user to admin in profiles table
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'YOUR_USER_ID';

-- 2. Sync role to Auth metadata (REQUIRED for RLS)
UPDATE auth.users
SET raw_user_meta_data = 
  jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  )
WHERE id = 'YOUR_USER_ID';
```

### 3. Verify
Once the script runs successfully, log out and log back in to the platform. You should now have access to the **Admin Portal** at `/admin`.

---

> [!NOTE]
> If you haven't created an account yet, please register first on the landing page as a "Student" or any role, then follow the steps above to change your role to "admin".

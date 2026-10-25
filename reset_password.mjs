import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  // Get users
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (usersError) {
    console.error("Error fetching users:", usersError);
    return;
  }

  const user = usersData.users.find(u => u.email === 'klarx94@gmail.com');
  if (!user) {
    console.log("User klarx94@gmail.com not found!");
    return;
  }

  console.log(`Found user: ${user.email} with ID: ${user.id}`);

  // Update password
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { password: 'Architect2026!' }
  );

  if (error) {
    console.error("Error updating password:", error);
  } else {
    console.log("Password successfully updated to: Architect2026!");
  }
}

run();

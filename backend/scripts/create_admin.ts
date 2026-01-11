
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  const email = 'admin@pms.com';
  const password = 'AdminPassword123!';
  const name = 'Admin User';

  console.log(`Attempting to create admin user: ${email}`);

  try {
    // Check if user exists
    const { data: listUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
        throw listError;
    }

    const existingUser = listUsers.users.find(u => u.email === email);

    if (existingUser) {
      console.log('User already exists. Updating metadata to ADMIN...');
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: { role: 'ADMIN', name: name },
          email_confirm: true
        }
      );

      if (updateError) throw updateError;
      console.log('User updated to ADMIN successfully.');
      
    } else {
      console.log('Creating new user...');
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: 'ADMIN'
        }
      });

      if (error) throw error;
      console.log('Admin user created successfully.');
    }

    console.log('\n-----------------------------------');
    console.log('ADMIN CREDENTIALS:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------------------\n');

  } catch (error: any) {
    console.error('Error creating admin:', error.message);
  }
}

createAdmin();

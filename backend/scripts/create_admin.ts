
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const prisma = new PrismaClient();

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
    let userId = '';

    if (existingUser) {
      console.log('User already exists. Updating metadata to SYSTEM_ADMIN...');
      userId = existingUser.id;
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: { role: 'SYSTEM_ADMIN', name: name },
          email_confirm: true
        }
      );

      if (updateError) throw updateError;
      console.log('User updated to SYSTEM_ADMIN successfully.');
      
    } else {
      console.log('Creating new user...');
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: 'SYSTEM_ADMIN'
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('User creation failed (no user returned)');
      
      userId = data.user.id;
      console.log('SYSTEM_ADMIN user created successfully.');
    }

    // Sync with Prisma
    console.log(`Syncing with database (ID: ${userId})...`);
    await prisma.user.upsert({
        where: { id: userId },
        update: {
            email,
            name,
            role: 'SYSTEM_ADMIN'
        },
        create: {
            id: userId,
            email,
            name,
            role: 'SYSTEM_ADMIN'
        }
    });
    console.log('Database sync successful.');

    console.log('\n-----------------------------------');
    console.log('ADMIN CREDENTIALS:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------------------\n');

  } catch (error: any) {
    console.error('Error creating admin:', error.message);
  } finally {
      await prisma.$disconnect();
  }
}

createAdmin();

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const SUPABASE_URL = 'https://dimvlcrgaqeqarohpszl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpbXZsY3JnYXFlcWFyb2hwc3psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA5MTgyNiwiZXhwIjoyMDgzNjY3ODI2fQ.9dlpgtxJ2ReOYgLQnOAHxr3ESwQK3SM-skmybB4gdd4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function fixAuth() {
  const email = 'supplier_admin@pms.com';
  const password = 'password123'; // Senha padrão para recuperação

  console.log(`Checking Auth user: ${email}...`);

  // 1. Check if user exists in Supabase Auth via Admin API
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  let authUser = users.find(u => u.email === email);

  if (!authUser) {
    console.log('User not found in Auth. Creating...');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      console.error('Error creating user:', error);
      return;
    }
    authUser = data.user;
    console.log('✅ Auth User created with ID:', authUser.id);
    console.log('🔑 Password set to:', password);
  } else {
    console.log('ℹ️ Auth User already exists with ID:', authUser.id);
    // FORCE PASSWORD RESET
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, { password: password });
    if (error) {
        console.error('Error resetting password:', error);
    } else {
        console.log('🔑 Password FORCE RESET to:', password);
    }
  }

  // 2. Sync with Prisma User table
  console.log('Syncing with Database...');
  const dbUser = await prisma.user.findUnique({ where: { email } });

  if (dbUser) {
    if (dbUser.id !== authUser.id) {
      console.log(`⚠️ ID Mismatch! DB: ${dbUser.id} vs Auth: ${authUser.id}`);
      // Update DB ID to match Auth ID (requires clean up if FKs exist, but let's try update)
      // Since ID is PK and likely FK, update might be tricky. 
      // Better strategy: Update Auth ID? No, can't easily.
      // We must assume DB record is wrong if Auth is master.
      // But deleting DB record loses data.
      
      // For now, let's just Log it. 
      // If the login logic relies on ID match, this is a problem.
      // But usually login logic is: Auth -> Get Token -> Backend validates Token -> Finds User by Email or ID in Token.
    } else {
        console.log('✅ IDs match.');
    }
  } else {
      console.log('User not in DB. Creating...');
      // Create user in DB with Auth ID
      await prisma.user.create({
          data: {
              id: authUser.id,
              email: email,
              name: 'Supplier Admin',
              role: 'SUPPLIER_ADMIN',
              // Add other required fields
          }
      });
      console.log('✅ DB User created.');
  }
}

fixAuth()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

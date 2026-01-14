import { PrismaClient } from '@prisma/client';
import { supabase } from './lib/supabase';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@pms.com';
  const password = 'AdminPassword123!';

  console.log(`🔄 Attempting to sync user: ${email}`);

  // 1. Try to login with Supabase to get the Real User ID
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    console.log('💡 If the user does not exist in Auth, you MUST sign up via the App first.');
    process.exit(1);
  }

  if (!data.user) {
    console.error('❌ Login succeeded but no user data returned.');
    process.exit(1);
  }

  const realUserId = data.user.id;
  console.log(`✅ Login successful! Real User ID: ${realUserId}`);

  // 2. Check if this user exists in our local database
  const existingUser = await prisma.user.findUnique({
    where: { id: realUserId }
  });

  // 3. Find the Account we created in the Seed
  const account = await prisma.account.findFirst({
    where: { name: 'Minha Loja Principal (Conta A)' }
  });

  if (!account) {
    console.error('❌ Account A not found. Did you run the seed?');
    process.exit(1);
  }

  if (existingUser) {
    console.log('✅ User already exists in local DB. Updating role/account just in case...');
    await prisma.user.update({
      where: { id: realUserId },
      data: {
        role: 'SYSTEM_ADMIN',
        accountId: account.id,
        name: 'Admin Mateus'
      }
    });
  } else {
    console.log('⚠️ User missing in local DB. Creating it now...');
    // We need to delete any potential "zombie" user with this email but wrong ID first
    // (Although we supposedly cleared it)
    await prisma.user.deleteMany({ where: { email } });

    await prisma.user.create({
      data: {
        id: realUserId,
        email: email,
        name: 'Admin Mateus',
        role: 'SYSTEM_ADMIN',
        accountId: account.id,
        status: 'ACTIVE'
      }
    });
  }

  console.log('🎉 User synced successfully! You can now login with:');
  console.log(`   Email: ${email}`);
  console.log(`   Pass:  ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

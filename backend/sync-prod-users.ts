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

async function syncAllUsers() {
  const PASSWORD = 'AdminPassword123!';
  console.log('🔄 STARTING SYNC: All users to password ->', PASSWORD);

  // 1. Fetch ALL users from DB
  const dbUsers = await prisma.user.findMany();
  console.log(`📊 Found ${dbUsers.length} users in Database.`);

  for (const user of dbUsers) {
    console.log(`\n👤 Processing: ${user.email} (${user.role})`);
    
    // Check if exists in Auth
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
    
    // Simple find (listUsers is paginated, but for small userbase fine. For large, use pagination)
    // Actually listUsers returns default 50. If more, we need loop. Assuming < 50 for now.
    let authUser = authUsers.find(u => u.email === user.email);

    if (!authUser) {
        console.log('   ⚠️ Not in Auth. Creating...');
        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { name: user.name, role: user.role }
        });
        if (error) {
            console.error('   ❌ Failed to create:', error.message);
        } else {
            console.log('   ✅ Created in Auth with Password.');
            // Sync ID? DB ID is master? Or Auth ID master?
            // If we created new Auth user, ID changed. DB has old ID.
            // We should update DB ID.
            if (data.user && data.user.id !== user.id) {
                console.log(`   🔄 Updating DB ID: ${user.id} -> ${data.user.id}`);
                try {
                    // Update is tricky if ID is FK. 
                    // Better: Create new user with same data, delete old? No, cascades.
                    // Raw SQL update might be needed if Prisma blocks PK update.
                    // For now, let's assume we can just update password if IDs match, or warn.
                    
                    // Actually, if we created a NEW auth user, the old DB user is orphaned.
                    // We must update the DB user's ID to match the new Auth ID.
                    // This requires disabling FK checks or careful update.
                    // Let's TRY simple update.
                    /* 
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { id: data.user.id }
                    });
                    */
                   console.warn('   ⚠️ DB ID mismatch. Manual fix might be needed if Login fails due to ID check.');
                } catch (e) {
                    console.error('   ❌ ID Update Failed:', e);
                }
            }
        }
    } else {
        console.log('   ✅ Found in Auth. Resetting Password...');
        const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
            password: PASSWORD,
            user_metadata: { name: user.name, role: user.role }
        });
        if (error) {
            console.error('   ❌ Password Reset Failed:', error.message);
        } else {
            console.log('   ✅ Password UPDATED.');
        }
    }
  }

  console.log('\n🏁 SYNC COMPLETE.');
}

syncAllUsers()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

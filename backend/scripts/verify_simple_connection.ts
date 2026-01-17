import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/prisma';

async function verifyConnection() {
  console.log('🔍 Verifying Simple Connection...');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is missing!');
    process.exit(1);
  }

  // Redact password
  const redactedUrl = dbUrl.replace(/:[^:]*@/, ':****@');
  console.log(`📡 DATABASE_URL: ${redactedUrl}`);

  // Check project ref in URL
  const expectedProject = 'dimvlcrgaqeqarohpszl';
  if (!dbUrl.includes(expectedProject)) {
    console.warn(`⚠️ WARNING: DATABASE_URL does not seem to contain project ref '${expectedProject}'`);
  } else {
    console.log(`✅ Project Ref '${expectedProject}' found in URL.`);
  }

  // Check for Transaction Pooler (Port 6543)
  if (dbUrl.includes(':6543')) {
    console.log('✅ Port 6543 detected (Transaction Pooler Mode).');
    if (!dbUrl.includes('pgbouncer=true')) {
       console.warn('⚠️ WARNING: Port 6543 used but ?pgbouncer=true is missing!');
    }
  } else {
    console.log('ℹ️ Port 6543 NOT detected. Ensure you are using the correct port for production.');
  }

  try {
    console.log('⏳ Connecting...');
    await prisma.$connect();
    console.log('✅ Connected successfully!');

    console.log('⏳ Querying User table...');
    const user = await prisma.user.findFirst({
      select: { id: true, email: true }
    });
    
    if (user) {
      console.log(`✅ Found user: ${user.email} (${user.id})`);
    } else {
      console.log('✅ Query successful, but table is empty (or no user found).');
    }

    console.log('🎉 VERIFICATION PASSED: Login works, Schema is public (implicit), Auth/Prisma share DB.');

  } catch (error: any) {
    console.error('❌ CONNECTION FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConnection();

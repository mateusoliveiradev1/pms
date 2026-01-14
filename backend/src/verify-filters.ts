import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { supabase } from './lib/supabase';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

async function main() {
  console.log('🔍 Starting Filter Verification Test...');

  // 1. Login to get Token
  const email = 'admin@pms.com';
  const password = 'AdminPassword123!';
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error('❌ Login failed:', authError?.message);
    process.exit(1);
  }

  const token = authData.session.access_token;
  console.log('✅ Login successful. Token obtained.');

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Get a Supplier to Filter By
  const supplierTech = await prisma.supplier.findFirst({
    where: { name: 'Fornecedor Tech' }
  });

  if (!supplierTech) {
    console.error('❌ Supplier "Fornecedor Tech" not found in DB. Did you seed?');
    process.exit(1);
  }
  console.log(`🎯 Target Supplier: ${supplierTech.name} (ID: ${supplierTech.id})`);

  // 3. Test Global Products (Should have 10+ items)
  console.log('\n--- Testing Global Products ---');
  try {
      const resGlobal = await axios.get(`${API_URL}/products`, { headers });
      console.log(`📦 Global Products Count: ${resGlobal.data.length}`);
      if (resGlobal.data.length < 8) console.warn('⚠️ Warning: Expected more products globally.');
  } catch (e: any) {
      console.error('❌ Failed to fetch global products:', e.message);
  }

  // 4. Test Filtered Products (Should have 5 items)
  console.log('\n--- Testing Filtered Products (?supplierId=...) ---');
  try {
      const url = `${API_URL}/products?supplierId=${supplierTech.id}`;
      console.log(`🔗 Requesting: ${url}`);
      const resFiltered = await axios.get(url, { headers });
      console.log(`📦 Filtered Products Count: ${resFiltered.data.length}`);
      
      if (resFiltered.data.length === 5) {
          console.log('✅ SUCCESS: Correctly filtered to 5 products.');
      } else {
          console.error(`❌ FAILURE: Expected 5 products, got ${resFiltered.data.length}. Filter is NOT working.`);
      }
  } catch (e: any) {
      console.error('❌ Failed to fetch filtered products:', e.message);
  }

  // 5. Test Sales Stats Filtered
  console.log('\n--- Testing Filtered Sales Stats ---');
  try {
      const url = `${API_URL}/reports/sales?supplierId=${supplierTech.id}`;
      console.log(`🔗 Requesting: ${url}`);
      const resSales = await axios.get(url, { headers });
      console.log(`💰 Filtered Total Orders: ${resSales.data.totalOrders}`);
      
      if (resSales.data.totalOrders === 3) {
           console.log('✅ SUCCESS: Correctly filtered to 3 orders.');
      } else {
           console.error(`❌ FAILURE: Expected 3 orders, got ${resSales.data.totalOrders}. Filter is NOT working.`);
      }
  } catch (e: any) {
      console.error('❌ Failed to fetch sales stats:', e.message);
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

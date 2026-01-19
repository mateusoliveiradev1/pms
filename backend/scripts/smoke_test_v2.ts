import axios from 'axios';

const BASE_URL = 'https://pms-backend-qalb.onrender.com/api';

const TEST_USER = {
    email: 'test_smoke_v2@pms.com',
    password: 'Test@123456',
    name: 'Smoke Test User'
};

const ADMIN_USER = {
    email: 'admin@pms.com',
    password: 'AdminPassword123!'
};

async function runSmokeTest() {
    console.log('🔵 Starting Smoke Test V2...');
    console.log(`Target: ${BASE_URL}`);

    try {
        // 1. Health Check
        console.log('\n👉 [1/4] Checking Health...');
        const healthRes = await axios.get(`${BASE_URL}/health`);
        if (healthRes.status === 200) {
            console.log('✅ Health Check Passed');
        } else {
            throw new Error(`Health check returned ${healthRes.status}`);
        }

        // 2. Register User
        console.log('\n👉 [2/4] Registering Test User...');
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                email: TEST_USER.email,
                password: TEST_USER.password,
                name: TEST_USER.name,
                accountName: 'Smoke Account',
                accountType: 'INDIVIDUAL'
            });
            console.log('✅ Register Passed');
        } catch (error: any) {
            if (error.response?.data?.message?.includes('already registered')) {
                console.log('⚠️ User already registered (OK to proceed)');
            } else {
                throw error;
            }
        }

        // 3. Login User
        console.log('\n👉 [3/4] Logging in Test User...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        if (loginRes.data.token) {
            console.log('✅ User Login Passed (Token received)');
        } else {
            throw new Error('No token returned for user login');
        }

        // 4. Login Admin
        console.log('\n👉 [4/4] Logging in System Admin...');
        const adminRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: ADMIN_USER.email,
            password: ADMIN_USER.password
        });
        
        if (adminRes.data.token) {
            console.log('✅ Admin Login Passed (Token received)');
            
            // Check Role
            const role = adminRes.data.user?.role;
            console.log(`   Role received: ${role}`);
            
            if (role === 'SYSTEM_ADMIN') {
                console.log('✅ Role Verified: SYSTEM_ADMIN');
            } else {
                throw new Error(`❌ Role Mismatch: Expected SYSTEM_ADMIN, got ${role}`);
            }
        } else {
            throw new Error('No token returned for admin login');
        }

        console.log('\n🟢 SMOKE TEST COMPLETED SUCCESSFULLY');
        process.exit(0);

    } catch (error: any) {
        console.error('\n🔴 SMOKE TEST FAILED');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

runSmokeTest();

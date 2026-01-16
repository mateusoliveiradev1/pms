import axios from 'axios';

const API_URL = 'https://pms-ops-backend.onrender.com/api';

async function testLogin() {
  console.log('Testing Login against:', API_URL);
  
  try {
    // 1. Health Check
    console.log('1. Checking Health...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Health OK:', health.data);
  } catch (error: any) {
    console.error('❌ Health Check Failed:', error.message);
    if (error.response) console.error('Status:', error.response.status);
    return; // Stop if health check fails
  }

  try {
    // 2. Login
    console.log('2. Attempting Login...');
    const login = await axios.post(`${API_URL}/auth/login`, {
      email: 'supplier_admin@pms.com',
      password: 'AdminPassword123!'
    });
    
    console.log('✅ Login SUCCESS!');
    console.log('Token:', login.data.token ? 'Received' : 'Missing');
    console.log('User:', login.data.user?.email);

  } catch (error: any) {
    console.error('❌ Login Failed:', error.message);
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
    }
  }
}

testLogin();

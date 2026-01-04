import axios from 'axios';

const ML_API_URL = 'https://api.mercadolibre.com';

export const getMe = async (accessToken: string) => {
  try {
    const response = await axios.get(`${ML_API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching ML user', error);
    throw error;
  }
};

// Placeholder for future implementation
// export const syncProducts = async () => { ... }
// export const syncOrders = async () => { ... }

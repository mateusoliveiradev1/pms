import axios from 'axios';

const ML_API_URL = 'https://api.mercadolibre.com';
const ML_AUTH_URL = 'https://auth.mercadolibre.com.br';

export const getAuthUrl = () => {
  const clientId = process.env.ML_CLIENT_ID;
  const redirectUri = process.env.ML_REDIRECT_URI;
  const scope = 'read write';
  return `${ML_AUTH_URL}/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&scope=${encodeURIComponent(scope)}`;
};

export const exchangeToken = async (code: string) => {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  const redirectUri = process.env.ML_REDIRECT_URI;

  const response = await axios.post(`${ML_API_URL}/oauth/token`, null, {
    params: {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data; // { access_token, refresh_token, expires_in, scope, user_id }
};

export const refreshToken = async (refreshToken: string) => {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  const response = await axios.post(`${ML_API_URL}/oauth/token`, null, {
    params: {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

export const getMe = async (accessToken: string) => {
  const response = await axios.get(`${ML_API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

export const fetchOrdersBySeller = async (accessToken: string, sellerId: string) => {
  const response = await axios.get(`${ML_API_URL}/orders/search?seller=${sellerId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

export const mapMlStatusToPms = (mlStatus: string): string => {
  const map: Record<string, string> = {
    paid: 'NEW',
    cancelled: 'CANCELLED',
    shipped: 'SHIPPING',
    delivered: 'DELIVERED',
  };
  return map[mlStatus] || 'NEW';
};

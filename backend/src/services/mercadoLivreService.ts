import axios from 'axios';

const ML_API_URL = 'https://api.mercadolibre.com';
const ML_AUTH_URL = 'https://auth.mercadolibre.com.br';

export const getAuthUrl = (redirectUri?: string) => {
  const clientId = process.env.ML_CLIENT_ID;
  const finalRedirectUri = redirectUri || process.env.ML_REDIRECT_URI;
  const scope = 'read write';
  return `${ML_AUTH_URL}/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(finalRedirectUri!)}&scope=${encodeURIComponent(scope)}`;
};

export const exchangeToken = async (code: string, redirectUri?: string) => {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  const finalRedirectUri = redirectUri || process.env.ML_REDIRECT_URI;

  const response = await axios.post(`${ML_API_URL}/oauth/token`, null, {
    params: {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: finalRedirectUri,
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

export const fetchItemsBySeller = async (accessToken: string, sellerId: string) => {
  // Busca IDs dos anúncios ativos
  const response = await axios.get(`${ML_API_URL}/users/${sellerId}/items/search?status=active`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data; 
};

export const getItemsDetails = async (accessToken: string, itemIds: string[]) => {
  if (itemIds.length === 0) return [];
  // ML allows up to 20 items per request usually, but let's assume ids list is chunked by caller or small enough
  // Or simply comma separated
  const ids = itemIds.join(',');
  const response = await axios.get(`${ML_API_URL}/items?ids=${ids}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data; // Array of objects like { code: 200, body: {...} }
};

export const predictCategory = async (accessToken: string, title: string) => {
    try {
        const response = await axios.get(`${ML_API_URL}/sites/MLB/category_predictor/predict?title=${encodeURIComponent(title)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data; // { id, name, ... }
    } catch (e) {
        console.error('Error predicting category', e);
        return { id: 'MLB1953' }; // Fallback "Outros"
    }
};

export const createItem = async (accessToken: string, product: any) => {
    // 1. Predict Category
    const categoryPrediction = await predictCategory(accessToken, product.name);
    const categoryId = categoryPrediction.id || 'MLB1953';

    // 2. Build Payload
    const payload = {
        title: product.name,
        category_id: categoryId,
        price: Number(product.price),
        currency_id: 'BRL',
        available_quantity: Number(product.stockAvailable),
        buying_mode: 'buy_it_now',
        listing_type_id: 'gold_special', // Standard listing type
        condition: 'new',
        description: {
            plain_text: product.description || 'Produto de alta qualidade.'
        },
        pictures: product.imageUrl ? [{ source: product.imageUrl }] : []
    };

    // 3. Post
    const response = await axios.post(`${ML_API_URL}/items`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    return response.data; // { id: 'MLB...', permalink: '...' }
};

export const updateItemStock = async (accessToken: string, mlId: string, quantity: number) => {
    try {
        await axios.put(`${ML_API_URL}/items/${mlId}`, {
            available_quantity: quantity
        }, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
    } catch (e) {
        console.error(`Error updating stock for ${mlId}`, e);
    }
};

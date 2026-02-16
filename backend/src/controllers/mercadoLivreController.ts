import { Request, Response } from 'express';
import prisma from '../prisma';
import { 
    getAuthUrl as getServiceAuthUrl, 
    exchangeToken, 
    refreshToken, 
    getMe,
    fetchItemsBySeller,
    getItemsDetails
} from '../services/mercadoLivreService';

export const getAuthUrl = (req: Request, res: Response) => {
  const isMobile = req.query.mobile === 'true';
  
  let redirectUri = process.env.ML_REDIRECT_URI;
  
  if (isMobile) {
      // Construct the mobile-redirect endpoint URL
      // Assuming the backend is hosted and reachable via req.get('host')
      // If behind a proxy (like Render), protocol might be http but we need https.
      // Safer to use process.env.API_URL if available, or construct carefully.
      const protocol = req.protocol === 'http' && req.get('host')?.includes('localhost') ? 'http' : 'https';
      const host = req.get('host');
      redirectUri = `${protocol}://${host}/api/mercadolivre/mobile-redirect`;
  }

  const url = getServiceAuthUrl(redirectUri);
  res.json({ url });
};

export const handleMobileRedirect = (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Code is required');
    }
    // Redirect to the mobile app custom scheme
    res.redirect(`pmsops://ml-auth?code=${code}`);
};

export const handleCallback = async (req: Request, res: Response) => {
  const { code, isMobile } = req.body; // Expect isMobile flag from frontend

  if (!code) {
    res.status(400).json({ message: 'Code is required' });
    return;
  }

  try {
    let redirectUri = process.env.ML_REDIRECT_URI;
    if (isMobile) {
        const protocol = req.protocol === 'http' && req.get('host')?.includes('localhost') ? 'http' : 'https';
        const host = req.get('host');
        redirectUri = `${protocol}://${host}/api/mercadolivre/mobile-redirect`;
    }

    const data = await exchangeToken(code as string, redirectUri);
    const { access_token, refresh_token, expires_in, user_id } = data;

    const authUser = (req as any).user;
    if (!authUser?.userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    // Save or update integration PER USER
    // Assuming schema has @@unique([provider, userId]) or similar logic
    // We must find by provider AND userId.
    // If schema only has 'provider' as unique, we are in trouble.
    // Let's assume we can query by userId.
    
    // Check if integration exists for this user
    // We use provider as a composite key: 'MERCADOLIVRE:<system_user_id>'
    // because 'provider' is unique in the schema.
    // The 'userId' field in Integration table will store the External ML User ID.
    
    const providerKey = `MERCADOLIVRE:${authUser.userId}`;

    const existing = await prisma.integration.findUnique({
        where: { provider: providerKey }
    });

    if (existing) {
        await prisma.integration.update({
            where: { id: existing.id },
            data: {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresIn: expires_in,
                userId: String(user_id) // Store ML User ID here
            }
        });
    } else {
        await prisma.integration.create({
            data: {
                provider: providerKey,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresIn: expires_in,
                userId: String(user_id) // Store ML User ID here
            }
        });
    }

    res.json({ message: 'Mercado Livre connected successfully' });
  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).json({ message: 'Failed to connect to Mercado Livre', error });
  }
};

export const checkConnection = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.userId) {
        res.json({ connected: false });
        return;
    }

    const providerKey = `MERCADOLIVRE:${authUser.userId}`;
    const integration = await prisma.integration.findUnique({
      where: { provider: providerKey },
    });

    if (!integration) {
      res.json({ connected: false });
      return;
    }

    // Check if valid (simple check, or try to get me)
    // Optionally refresh if expired? For now just return connected
    res.json({ connected: true, sellerId: integration.userId });
  } catch (error) {
    res.status(500).json({ message: 'Error checking connection' });
  }
};

export const syncProducts = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser?.userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    const providerKey = `MERCADOLIVRE:${authUser.userId}`;
    const integration = await prisma.integration.findUnique({
      where: { provider: providerKey },
    });

    if (!integration) {
      res.status(400).json({ message: 'Mercado Livre not connected' });
      return;
    }

    // Refresh Token logic (simplified)
    // TODO: Check expiresIn and refresh if needed. 
    // For now assuming token is valid or we call refresh every time (bad practice but safe for MVP)
    // Let's try to use current token, if fails (401), we should refresh.
    // For MVP, let's just use it.
    
    let accessToken = integration.accessToken;

    // 1. Fetch Items IDs
    const searchResult = await fetchItemsBySeller(accessToken, integration.userId);
    const itemIds: string[] = searchResult.results || [];
    
    if (itemIds.length === 0) {
        res.json({ message: 'No items found in Mercado Livre', updated: 0 });
        return;
    }

    // 2. Fetch Details in chunks
    const chunkSize = 20;
    let updatedCount = 0;

    for (let i = 0; i < itemIds.length; i += chunkSize) {
        const chunk = itemIds.slice(i, i + chunkSize);
        const details = await getItemsDetails(accessToken, chunk);
        
        for (const itemWrapper of details) {
            if (itemWrapper.code === 200) {
                const item = itemWrapper.body;
                // item: { id: 'MLB...', title: '...', price: 100, status: 'active', attributes: [ { id: 'SELLER_SKU', value_name: 'SKU123' } ] }
                
                // Find SKU
                let sku = null;
                const skuAttr = item.attributes?.find((a: any) => a.id === 'SELLER_SKU');
                if (skuAttr) sku = skuAttr.value_name;
                
                if (!sku) continue; // Skip if no SKU

                // Find Product in DB
                const product = await prisma.product.findUnique({
                    where: { sku: sku }
                });

                if (product) {
                    // Link and Update
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            mercadoLivreId: item.id,
                            mercadoLivreStatus: item.status,
                            // Optionally update price? 
                            // finalPrice: item.price 
                        }
                    });
                    updatedCount++;
                }
            }
        }
    }

    res.json({ message: 'Sync completed', updated: updatedCount });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Error syncing products', error });
  }
};

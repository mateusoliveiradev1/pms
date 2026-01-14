
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data repair...');

  // 1. Ensure at least one supplier exists
  let defaultSupplier = await prisma.supplier.findFirst();
  if (!defaultSupplier) {
    console.log('No suppliers found. Creating a default one.');
    // Check for a user to link to
    const user = await prisma.user.findFirst();
    if (!user || !user.accountId) {
        console.error('No users found or user has no account. Cannot create supplier.');
        return;
    }
    
    defaultSupplier = await prisma.supplier.create({
        data: {
            name: 'Default Supplier',
            integrationType: 'MANUAL',
            user: { connect: { id: user.id } },
            account: { connect: { id: user.accountId as string } }
        }
    });
  }
  console.log(`Using Default Supplier: ${defaultSupplier.name} (${defaultSupplier.id})`);

  // 2. Fix Products (Link to Supplier)
  const products = await prisma.product.findMany({
    include: { suppliers: true }
  });
  console.log(`Found ${products.length} products.`);

  for (const p of products) {
    if (p.suppliers.length === 0) {
        console.log(`Product ${p.name} has no supplier. Linking...`);
        await prisma.productSupplier.create({
            data: {
                productId: p.id,
                supplierId: defaultSupplier.id,
                price: p.price,
                stock: p.stockAvailable,
                virtualStock: p.stockAvailable,
                safetyStock: 0,
                externalId: `FIX-${p.sku}`
            }
        });
    }
  }

  // 3. Fix Orders (Ensure supplierId is set)
  // Check for orders with potentially broken supplier links (if any)
  const orders = await prisma.order.findMany();
  console.log(`Found ${orders.length} orders.`);
  
  // Optional: List order distribution
  const distribution: Record<string, number> = {};
  for(const o of orders) {
      distribution[o.supplierId] = (distribution[o.supplierId] || 0) + 1;
  }
  console.log('Order Distribution:', distribution);

  console.log('Data repair finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

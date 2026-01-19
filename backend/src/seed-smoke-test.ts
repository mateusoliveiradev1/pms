import { PrismaClient, Role, AccountType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Cleaning database...');

  // Delete in order to avoid foreign key constraints
  try {
      await prisma.financialLedger.deleteMany({});
      await prisma.withdrawalRequest.deleteMany({});
      await prisma.supplierCommission.deleteMany({});
      await prisma.notification.deleteMany({});
      await prisma.inventoryLog.deleteMany({});
      await prisma.orderItem.deleteMany({});
      await prisma.order.deleteMany({});
      await prisma.productSupplier.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.subscription.deleteMany({});
      await prisma.supplier.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.account.deleteMany({});
      await prisma.plan.deleteMany({});
  } catch (e) {
      console.log('Clean up warning (tables might not exist):', e);
  }

  console.log('✅ Database cleaned.');

  console.log('🌱 Seeding fresh data...');

  // 1. Create Plan
  const plan = await prisma.plan.create({
    data: {
      name: 'Professional',
      monthlyPrice: 99.90,
      limitProducts: 1000,
      limitOrders: 1000,
      commissionPercent: 5.0
    }
  });

  // 2. Create Accounts
  const accountA_real = await prisma.account.create({
    data: {
      name: 'Minha Loja Principal (Conta A)',
      type: AccountType.BUSINESS,
      planId: plan.id
    }
  });

  const accountB_real = await prisma.account.create({
    data: {
      name: 'Loja Concorrente (Conta B)',
      type: AccountType.BUSINESS,
      planId: plan.id
    }
  });

  // 3. Create Users
  const passwordHash = await bcrypt.hash('123456', 10);
  const { v4: uuidv4 } = require('uuid');

  const adminUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      name: 'Admin Mateus',
      email: 'admin@pms.com',
      role: Role.SYSTEM_ADMIN,
      accountId: accountA_real.id
    }
  });

  // 4. Create Suppliers for Account A
  const supplierTech = await prisma.supplier.create({
    data: {
      name: 'Fornecedor Tech',
      // phone: '11999990001', // Removed as it is not in schema
      // document: '00011122200011', // Not in schema for Supplier? Let's check schema again if needed, but error didn't complain about document?
      // Wait, error only complained about 'phone'.
      // Wait, previous error didn't complain about document.
      // Schema for Supplier:
      // name, type, supplierType, integrationType, shippingDeadline, status, active, userId, accountId, isDefault
      // billingName, billingDoc, billingAddress, billingEmail
      // NO PHONE, NO DOCUMENT (billingDoc is there).
      integrationType: 'MANUAL', // Required
      accountId: accountA_real.id,
      status: 'ACTIVE',
      financialStatus: 'ACTIVE',
      billingEmail: 'tech@supplier.com'
    }
  });

  const supplierModa = await prisma.supplier.create({
    data: {
      name: 'Fornecedor Moda',
      // phone: '11999990002',
      integrationType: 'MANUAL',
      accountId: accountA_real.id,
      status: 'ACTIVE',
      financialStatus: 'ACTIVE',
      billingEmail: 'moda@supplier.com'
    }
  });

  // Supplier for Account B (Isolated)
  const supplierB = await prisma.supplier.create({
    data: {
      name: 'Fornecedor Externo B',
      // phone: '11999990003',
      integrationType: 'MANUAL',
      accountId: accountB_real.id,
      status: 'ACTIVE',
      financialStatus: 'ACTIVE',
      billingEmail: 'b@supplier.com'
    }
  });

  // Subscriptions
  await prisma.subscription.create({ data: { supplierId: supplierTech.id, planId: plan.id, status: 'ACTIVE', startDate: new Date(), endDate: new Date(Date.now() + 30*24*60*60*1000) } });
  await prisma.subscription.create({ data: { supplierId: supplierModa.id, planId: plan.id, status: 'ACTIVE', startDate: new Date(), endDate: new Date(Date.now() + 30*24*60*60*1000) } });
  await prisma.subscription.create({ data: { supplierId: supplierB.id, planId: plan.id, status: 'ACTIVE', startDate: new Date(), endDate: new Date(Date.now() + 30*24*60*60*1000) } });


  // 5. Create Products
  // Tech Products (5 items)
  for (let i = 1; i <= 5; i++) {
    await prisma.product.create({
      data: {
        name: `Produto Tech ${i}`,
        sku: `TECH-${i}`,
        description: `Descrição do produto tech ${i}`,
        price: 100 * i,
        stockAvailable: 50,
        marginType: 'PERCENTAGE',
        marginValue: 20,
        suppliers: {
          create: {
            supplierId: supplierTech.id,
            price: 80 * i,
            stock: 100,
            virtualStock: 100,
            safetyStock: 5,
            externalId: `EXT-TECH-${i}`
          }
        },
        inventoryLogs: {
          create: { quantity: 50, type: 'RESTOCK', reason: 'Initial Seed' }
        }
      }
    });
  }

  // Moda Products (5 items)
  for (let i = 1; i <= 5; i++) {
    await prisma.product.create({
      data: {
        name: `Produto Moda ${i}`,
        sku: `MODA-${i}`,
        description: `Descrição do produto moda ${i}`,
        price: 50 * i,
        stockAvailable: 20,
        marginType: 'FIXED',
        marginValue: 10,
        suppliers: {
          create: {
            supplierId: supplierModa.id,
            price: 40 * i,
            stock: 50,
            virtualStock: 50,
            safetyStock: 2,
            externalId: `EXT-MODA-${i}`
          }
        },
        inventoryLogs: {
          create: { quantity: 20, type: 'RESTOCK', reason: 'Initial Seed' }
        }
      }
    });
  }

  // Account B Products (3 items)
  for (let i = 1; i <= 3; i++) {
    await prisma.product.create({
      data: {
        name: `Produto Isolado B ${i}`,
        sku: `ISO-${i}`,
        description: `Produto da conta B`,
        price: 200,
        stockAvailable: 10,
        suppliers: {
          create: {
            supplierId: supplierB.id,
            price: 150,
            stock: 20,
            virtualStock: 20,
            safetyStock: 1,
            externalId: `EXT-B-${i}`
          }
        },
        inventoryLogs: {
            create: { quantity: 10, type: 'RESTOCK', reason: 'Initial Seed' }
        }
      }
    });
  }

  // 6. Create Orders
  // Orders for Tech Supplier (3 Orders)
  // We need to fetch product IDs first
  const techProds = await prisma.product.findMany({ where: { sku: { startsWith: 'TECH' } } });
  
  for (let i = 0; i < 3; i++) {
    await prisma.order.create({
      data: {
        orderNumber: `ORD-TECH-${i+1}`,
        customerName: `Cliente Tech ${i+1}`,
        totalAmount: techProds[0].price * 2,
        status: 'NEW',
        supplierId: supplierTech.id,
        items: {
          create: {
            productId: techProds[0].id,
            quantity: 2,
            unitPrice: techProds[0].price,
            total: techProds[0].price * 2,
            sku: techProds[0].sku
          }
        },
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Spread over days
      }
    });
  }

  // Orders for Moda Supplier (2 Orders)
  const modaProds = await prisma.product.findMany({ where: { sku: { startsWith: 'MODA' } } });
  for (let i = 0; i < 2; i++) {
    await prisma.order.create({
      data: {
        orderNumber: `ORD-MODA-${i+1}`,
        customerName: `Cliente Moda ${i+1}`,
        totalAmount: modaProds[0].price,
        status: 'DELIVERED',
        supplierId: supplierModa.id,
        items: {
          create: {
            productId: modaProds[0].id,
            quantity: 1,
            unitPrice: modaProds[0].price,
            total: modaProds[0].price,
            sku: modaProds[0].sku
          }
        },
        createdAt: new Date()
      }
    });
  }

  // Order for Account B
  const bProds = await prisma.product.findMany({ where: { sku: { startsWith: 'ISO' } } });
  await prisma.order.create({
    data: {
      orderNumber: `ORD-B-1`,
      customerName: `Cliente B`,
      totalAmount: 200,
      status: 'NEW',
      supplierId: supplierB.id,
      items: {
        create: {
          productId: bProds[0].id,
          quantity: 1,
          unitPrice: 200,
          total: 200,
          sku: bProds[0].sku
        }
      }
    }
  });

  console.log('✅ Seeding completed!');
  console.log(`
  Resumo do Seed:
  -----------------------------------
  Conta A (Principal):
    - Fornecedor Tech: 5 Produtos, 3 Pedidos (Status: NEW)
    - Fornecedor Moda: 5 Produtos, 2 Pedidos (Status: DELIVERED)
  
  Conta B (Isolada):
    - Fornecedor Externo B: 3 Produtos, 1 Pedido
  
  System Admin: admin@pms.com / 123456
  -----------------------------------
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

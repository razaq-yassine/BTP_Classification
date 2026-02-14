import { db } from './index.js'
import { users, customers, orders, products, categories } from './schema.js'
import bcrypt from 'bcrypt'

/** Seed data only - tables are created by Drizzle migrations */
export async function initDb() {
  const userList = await db.select().from(users)
  if (userList.length === 0) {
    const hash = await bcrypt.hash('admin123', 10)
    await db.insert(users).values({
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: hash,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      dateJoined: new Date(),
    })
    console.log('Created admin user: admin/admin123')
  }

  const customerCount = await db.select().from(customers)
  if (customerCount.length === 0) {
    const now = new Date()
    await db.insert(customers).values([
      { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', phone: '+1234567890', company: 'Acme Corp', address: '123 Main St, Anytown, USA', createdAt: now, updatedAt: now },
      { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', phone: '+1987654321', company: 'Tech Solutions', address: '456 Oak Ave, Another City, USA', createdAt: now, updatedAt: now },
      { firstName: 'Bob', lastName: 'Johnson', email: 'bob.johnson@example.com', phone: '+1555123456', company: 'Global Industries', address: '789 Pine Rd, Somewhere, USA', createdAt: now, updatedAt: now },
      { firstName: 'Alice', lastName: 'Williams', email: 'alice.williams@example.com', phone: '+1444987654', company: 'Innovation Labs', address: '321 Elm St, Elsewhere, USA', createdAt: now, updatedAt: now },
      { firstName: 'Charlie', lastName: 'Brown', email: 'charlie.brown@example.com', phone: '+1333456789', company: 'Creative Agency', address: '654 Maple Dr, Nowhere, USA', createdAt: now, updatedAt: now },
    ])
    const custs = await db.select().from(customers)
    const orderNow = new Date()
    const orderPast = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    await db.insert(orders).values([
      { name: 'ORD-001', customerId: custs[0].id!, status: 'CONFIRMED', totalAmount: 299.99, description: 'Software License - Premium Package', orderDate: orderPast, createdAt: orderNow, updatedAt: orderNow },
      { name: 'ORD-002', customerId: custs[0].id!, status: 'SHIPPED', totalAmount: 149.5, description: 'Hardware Accessories', orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), createdAt: orderNow, updatedAt: orderNow },
      { name: 'ORD-003', customerId: custs[1].id!, status: 'PENDING', totalAmount: 599, description: 'Enterprise Solution Setup', orderDate: new Date(Date.now() - 24 * 60 * 60 * 1000), createdAt: orderNow, updatedAt: orderNow },
      { name: 'ORD-004', customerId: custs[1].id!, status: 'DELIVERED', totalAmount: 89.99, description: 'Monthly Subscription', orderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), createdAt: orderNow, updatedAt: orderNow },
      { name: 'ORD-005', customerId: custs[2].id!, status: 'CONFIRMED', totalAmount: 1299.99, description: 'Custom Development Package', orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), createdAt: orderNow, updatedAt: orderNow },
      { name: 'ORD-006', customerId: custs[3].id!, status: 'CANCELLED', totalAmount: 199.99, description: 'Training Package - Cancelled', orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), createdAt: orderNow, updatedAt: orderNow },
    ] as any)
    console.log('Created sample customers and orders')
  }

  const productCount = await db.select().from(products)
  if (productCount.length === 0) {
    const now = new Date()
    await db.insert(products).values([
      { name: 'Widget Pro', sku: 'SKU-001', price: 29.99, description: 'Premium widget', createdAt: now, updatedAt: now },
      { name: 'Gadget X', sku: 'SKU-002', price: 49.99, description: 'Advanced gadget', createdAt: now, updatedAt: now },
      { name: 'Tool Kit', sku: 'SKU-003', price: 79.99, description: 'Complete tool set', createdAt: now, updatedAt: now },
    ] as any)
    console.log('Created sample products')
  }

  const categoryCount = await db.select().from(categories)
  if (categoryCount.length === 0) {
    const now = new Date()
    await db.insert(categories).values([
      { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets', createdAt: now, updatedAt: now },
      { name: 'Software', slug: 'software', description: 'Software and digital products', createdAt: now, updatedAt: now },
      { name: 'Services', slug: 'services', description: 'Professional services', createdAt: now, updatedAt: now },
    ])
    console.log('Created sample categories')
  }
}

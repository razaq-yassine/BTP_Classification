/**
 * Seeds multi-org, multi-tenant test data.
 * Run after db:deploy when tenant-config.json mode is org_and_tenant.
 *
 * Creates:
 * - 2 organizations: Acme Corp, TechStart
 * - 2 tenants per org: Acme-US, Acme-EU; TechStart-US, TechStart-UK
 * - Users: admin (platform), acme-us-user, acme-eu-user, tech-us-user
 * - Customers and orders per tenant
 * - Products (platform-wide)
 */
import "dotenv/config";
import { fileURLToPath } from "url";
import { db } from "../src/db/index.js";
import { organizations, tenants, users, customers, orders, orderitems, products, } from "../src/db/schema.js";
import { seedNotificationSettings } from "./seed-notification-settings.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
export async function seedMultiTenant() {
    const now = new Date();
    // 1. Organizations (create only if missing)
    const orgList = await db.select().from(organizations);
    const hasAcme = orgList.some((o) => o.slug === "acme");
    const hasTechStart = orgList.some((o) => o.slug === "techstart");
    if (!hasAcme || !hasTechStart) {
        await db.insert(organizations).values([
            ...(!hasAcme ? [{ name: "Acme Corp", slug: "acme", createdAt: now, updatedAt: now }] : []),
            ...(!hasTechStart ? [{ name: "TechStart", slug: "techstart", createdAt: now, updatedAt: now }] : []),
        ]);
    }
    const orgs = await db.select().from(organizations);
    const acmeOrg = orgs.find((o) => o.slug === "acme");
    const techOrg = orgs.find((o) => o.slug === "techstart");
    // 2. Tenants (create only if missing)
    const tenantList = await db.select().from(tenants);
    const hasTenants = tenantList.length >= 4;
    if (!hasTenants) {
        await db.insert(tenants).values([
            { name: "Acme US", organizationId: acmeOrg.id, createdAt: now, updatedAt: now },
            { name: "Acme EU", organizationId: acmeOrg.id, createdAt: now, updatedAt: now },
            { name: "TechStart US", organizationId: techOrg.id, createdAt: now, updatedAt: now },
            { name: "TechStart UK", organizationId: techOrg.id, createdAt: now, updatedAt: now },
        ]);
    }
    const tenantListFinal = await db.select().from(tenants);
    const acmeUS = tenantListFinal.find((t) => t.name === "Acme US");
    const acmeEU = tenantListFinal.find((t) => t.name === "Acme EU");
    const techUS = tenantListFinal.find((t) => t.name === "TechStart US");
    // 3. Users
    const hashAdmin = await bcrypt.hash("admin123", 10);
    const hashAcme = await bcrypt.hash("acme123", 10);
    const hashTech = await bcrypt.hash("tech123", 10);
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
        await db.insert(users).values([
            {
                username: "admin",
                email: "admin@example.com",
                passwordHash: hashAdmin,
                firstName: "Admin",
                lastName: "User",
                profile: "admin",
                isActive: true,
                dateJoined: now,
            },
            {
                username: "acme-us-user",
                email: "acme.us@example.com",
                passwordHash: hashAcme,
                firstName: "Acme",
                lastName: "US User",
                profile: "tenant-user",
                isActive: true,
                dateJoined: now,
                organizationId: acmeOrg.id,
                tenantId: acmeUS.id,
            },
            {
                username: "acme-eu-user",
                email: "acme.eu@example.com",
                passwordHash: hashAcme,
                firstName: "Acme",
                lastName: "EU User",
                profile: "tenant-user",
                isActive: true,
                dateJoined: now,
                organizationId: acmeOrg.id,
                tenantId: acmeEU.id,
            },
            {
                username: "tech-us-user",
                email: "tech.us@example.com",
                passwordHash: hashTech,
                firstName: "Tech",
                lastName: "US User",
                profile: "tenant-user",
                isActive: true,
                dateJoined: now,
                organizationId: techOrg.id,
                tenantId: techUS.id,
            },
            {
                username: "acme-org-user",
                email: "acme.org@example.com",
                passwordHash: hashAcme,
                firstName: "Acme",
                lastName: "Org User",
                profile: "org-user",
                isActive: true,
                dateJoined: now,
                organizationId: acmeOrg.id,
                tenantId: null,
            },
            {
                username: "tech-org-user",
                email: "tech.org@example.com",
                passwordHash: hashTech,
                firstName: "Tech",
                lastName: "Org User",
                profile: "org-user",
                isActive: true,
                dateJoined: now,
                organizationId: techOrg.id,
                tenantId: null,
            },
            {
                username: "acme-owner",
                email: "acme.owner@example.com",
                passwordHash: hashAcme,
                firstName: "Acme",
                lastName: "Owner",
                profile: "org-owner",
                isActive: true,
                dateJoined: now,
                organizationId: acmeOrg.id,
                tenantId: null,
            },
        ]);
        console.log("[seed-multi-tenant] Created users: admin, acme-us-user, acme-eu-user, tech-us-user, acme-org-user, tech-org-user, acme-owner");
    }
    else {
        // Update admin to ensure no org/tenant (platform admin)
        await db.update(users).set({ organizationId: null, tenantId: null }).where(eq(users.username, "admin"));
        // Ensure tenant users have tenant-user profile, org users have org-user profile
        for (const un of ["acme-us-user", "acme-eu-user", "tech-us-user"]) {
            await db.update(users).set({ profile: "tenant-user" }).where(eq(users.username, un));
        }
        for (const un of ["acme-org-user", "tech-org-user"]) {
            await db.update(users).set({ profile: "org-user" }).where(eq(users.username, un));
        }
        await db.update(users).set({ profile: "org-owner" }).where(eq(users.username, "acme-owner"));
        // Create tenant users and org users if they don't exist
        const usernames = existingUsers.map((u) => u.username);
        const toInsert = [];
        if (!usernames.includes("acme-us-user")) {
            toInsert.push({
                username: "acme-us-user",
                email: "acme.us@example.com",
                passwordHash: hashAcme,
                firstName: "Acme",
                lastName: "US User",
                profile: "tenant-user",
                isActive: true,
                dateJoined: now,
                organizationId: acmeOrg.id,
                tenantId: acmeUS.id,
            });
        }
        if (!usernames.includes("acme-eu-user")) {
            toInsert.push({
                username: "acme-eu-user",
                email: "acme.eu@example.com",
                passwordHash: hashAcme,
                firstName: "Acme",
                lastName: "EU User",
                profile: "tenant-user",
                isActive: true,
                dateJoined: now,
                organizationId: acmeOrg.id,
                tenantId: acmeEU.id,
            });
        }
        if (!usernames.includes("tech-us-user")) {
            toInsert.push({
                username: "tech-us-user",
                email: "tech.us@example.com",
                passwordHash: hashTech,
                firstName: "Tech",
                lastName: "US User",
                profile: "tenant-user",
                isActive: true,
                dateJoined: now,
                organizationId: techOrg.id,
                tenantId: techUS.id,
            });
        }
        if (!usernames.includes("acme-org-user")) {
            toInsert.push({
                username: "acme-org-user",
                email: "acme.org@example.com",
                passwordHash: hashAcme,
                firstName: "Acme",
                lastName: "Org User",
                profile: "org-user",
                isActive: true,
                dateJoined: now,
                organizationId: acmeOrg.id,
                tenantId: null,
            });
        }
        if (!usernames.includes("tech-org-user")) {
            toInsert.push({
                username: "tech-org-user",
                email: "tech.org@example.com",
                passwordHash: hashTech,
                firstName: "Tech",
                lastName: "Org User",
                profile: "org-user",
                isActive: true,
                dateJoined: now,
                organizationId: techOrg.id,
                tenantId: null,
            });
        }
        if (!usernames.includes("acme-owner")) {
            toInsert.push({
                username: "acme-owner",
                email: "acme.owner@example.com",
                passwordHash: hashAcme,
                firstName: "Acme",
                lastName: "Owner",
                profile: "org-owner",
                isActive: true,
                dateJoined: now,
                organizationId: acmeOrg.id,
                tenantId: null,
            });
        }
        if (toInsert.length > 0) {
            await db.insert(users).values(toInsert);
            console.log("[seed-multi-tenant] Created tenant users");
        }
    }
    // 4. Products (platform-wide)
    const productCount = await db.select().from(products);
    if (productCount.length === 0) {
        await db.insert(products).values([
            { name: "Widget Pro", sku: "SKU-001", price: 29.99, description: "Premium widget", createdAt: now, updatedAt: now },
            { name: "Gadget X", sku: "SKU-002", price: 49.99, description: "Advanced gadget", createdAt: now, updatedAt: now },
            { name: "Tool Kit", sku: "SKU-003", price: 79.99, description: "Complete tool set", createdAt: now, updatedAt: now },
        ]);
        console.log("[seed-multi-tenant] Created products");
    }
    // 5. Customers and orders per tenant
    const customerCount = await db.select().from(customers);
    if (customerCount.length === 0) {
        // Acme US
        await db.insert(customers).values([
            {
                firstName: "John",
                lastName: "Doe",
                email: "john.acmeus@example.com",
                phone: "+1234567890",
                company: "Acme US Client",
                organizationId: acmeOrg.id,
                tenantId: acmeUS.id,
                createdAt: now,
                updatedAt: now,
            },
            {
                firstName: "Jane",
                lastName: "Smith",
                email: "jane.acmeus@example.com",
                phone: "+1987654321",
                company: "Acme US Client 2",
                organizationId: acmeOrg.id,
                tenantId: acmeUS.id,
                createdAt: now,
                updatedAt: now,
            },
        ]);
        const acmeUSCustomers = await db
            .select()
            .from(customers)
            .where(eq(customers.tenantId, acmeUS.id));
        const c1 = acmeUSCustomers[0];
        const prods = await db.select().from(products);
        await db.insert(orders).values({
            name: "ORD-A1-001",
            status: "CONFIRMED",
            totalAmount: 299.99,
            description: "Acme US Order 1",
            orderDate: now,
            organizationId: acmeOrg.id,
            tenantId: acmeUS.id,
            customerId: c1.id,
            createdAt: now,
            updatedAt: now,
        });
        const acmeUSOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.tenantId, acmeUS.id));
        const o1 = acmeUSOrders[0];
        await db.insert(orderitems).values({
            name: "OI-A1-001",
            orderId: o1.id,
            productId: prods[0].id,
            quantity: 2,
            unitPrice: 29.99,
            organizationId: acmeOrg.id,
            tenantId: acmeUS.id,
            createdAt: now,
            updatedAt: now,
        });
        // Acme EU
        await db.insert(customers).values({
            firstName: "Bob",
            lastName: "Johnson",
            email: "bob.acmeeu@example.com",
            phone: "+44123456789",
            company: "Acme EU Client",
            organizationId: acmeOrg.id,
            tenantId: acmeEU.id,
            createdAt: now,
            updatedAt: now,
        });
        const acmeEUCustomers = await db
            .select()
            .from(customers)
            .where(eq(customers.tenantId, acmeEU.id));
        const c3 = acmeEUCustomers[0];
        await db.insert(orders).values({
            name: "ORD-A2-001",
            status: "PENDING",
            totalAmount: 149.5,
            description: "Acme EU Order 1",
            orderDate: now,
            organizationId: acmeOrg.id,
            tenantId: acmeEU.id,
            customerId: c3.id,
            createdAt: now,
            updatedAt: now,
        });
        // TechStart US
        await db.insert(customers).values({
            firstName: "Charlie",
            lastName: "Brown",
            email: "charlie.techus@example.com",
            phone: "+1555123456",
            company: "TechStart US Client",
            organizationId: techOrg.id,
            tenantId: techUS.id,
            createdAt: now,
            updatedAt: now,
        });
        const techUSCustomers = await db
            .select()
            .from(customers)
            .where(eq(customers.tenantId, techUS.id));
        const c4 = techUSCustomers[0];
        await db.insert(orders).values({
            name: "ORD-T1-001",
            status: "SHIPPED",
            totalAmount: 599,
            description: "TechStart US Order 1",
            orderDate: now,
            organizationId: techOrg.id,
            tenantId: techUS.id,
            customerId: c4.id,
            createdAt: now,
            updatedAt: now,
        });
        console.log("[seed-multi-tenant] Created customers and orders per tenant");
    }
    await seedNotificationSettings();
    console.log("[seed-multi-tenant] Done. Test users:");
    console.log("  admin / admin123 (platform admin, no org/tenant)");
    console.log("  acme-us-user / acme123 (Acme Corp, Acme US - tenant user)");
    console.log("  acme-eu-user / acme123 (Acme Corp, Acme EU - tenant user)");
    console.log("  tech-us-user / tech123 (TechStart, TechStart US - tenant user)");
    console.log("  acme-org-user / acme123 (Acme Corp, all tenants - org user)");
    console.log("  tech-org-user / tech123 (TechStart, all tenants - org user)");
    console.log("  acme-owner / acme123 (Acme Corp - org owner, can edit org/tenant config)");
}
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1]?.endsWith("seed-multi-tenant.ts") ?? false;
if (isMain) {
    seedMultiTenant()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error("[seed-multi-tenant]", err);
        process.exit(1);
    });
}
//# sourceMappingURL=seed-multi-tenant.js.map
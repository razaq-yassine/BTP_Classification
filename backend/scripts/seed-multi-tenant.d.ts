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
export declare function seedMultiTenant(): Promise<void>;
//# sourceMappingURL=seed-multi-tenant.d.ts.map
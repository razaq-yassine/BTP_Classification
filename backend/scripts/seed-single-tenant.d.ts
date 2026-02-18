/**
 * Seeds single-tenant mode: one org, one tenant.
 * Run after db:deploy when tenant-config.json mode is single_tenant.
 *
 * Creates:
 * - 1 organization: Default Org
 * - 1 tenant: Default Tenant
 * - Assigns all existing users to that org/tenant (except admin)
 */
import "dotenv/config";
export declare function seedSingleTenant(): Promise<void>;
//# sourceMappingURL=seed-single-tenant.d.ts.map
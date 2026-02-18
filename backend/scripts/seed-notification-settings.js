/**
 * Seeds notification_settings from metadata/notification-events.json.
 * Called from seed-single-tenant and seed-multi-tenant.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../src/db/index.js";
import { notificationSettings } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
const defaultMetadataPath = path.join(backendRoot, "../frontend/public/metadata");
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath;
const NOTIFICATION_EVENTS_PATH = path.join(METADATA_PATH, "notification-events.json");
export async function seedNotificationSettings() {
    if (!fs.existsSync(NOTIFICATION_EVENTS_PATH))
        return;
    let events;
    try {
        const data = JSON.parse(fs.readFileSync(NOTIFICATION_EVENTS_PATH, "utf-8"));
        events = (data || [])
            .filter((e) => e && typeof e.key === "string")
            .map((e) => ({
            key: e.key,
            defaultTemplateKey: e.defaultTemplateKey || e.key,
        }));
    }
    catch {
        return;
    }
    for (const ev of events) {
        const [existing] = await db
            .select()
            .from(notificationSettings)
            .where(eq(notificationSettings.eventKey, ev.key));
        if (!existing) {
            await db.insert(notificationSettings).values({
                eventKey: ev.key,
                enabled: false,
                templateKey: ev.defaultTemplateKey,
            });
        }
    }
}
//# sourceMappingURL=seed-notification-settings.js.map
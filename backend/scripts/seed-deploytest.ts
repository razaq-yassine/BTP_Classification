/**
 * Seeds deploytest records with sample data for all field types including
 * password, geolocation, address, richText, and file.
 *
 * Run after db:deploy: pnpm run db:seed-deploytest
 */
import "dotenv/config";
import { db } from "../src/db/index.js";
import { deploytests } from "../src/db/schema.js";

const now = new Date();

const SAMPLE_RECORDS = [
  {
    name: "DT-001",
    fString: "Sample string",
    fNumber: "42",
    fBoolean: true,
    fDate: now,
    fDatetime: now,
    fEmail: "test@example.com",
    fPhone: "+1 555-123-4567",
    fText: "Plain text content for testing.",
    fUrl: "example.com",
    fPassword: "secret123",
    fGeolocation: JSON.stringify({ latitude: 37.7749, longitude: -122.4194 }),
    fAddress: JSON.stringify({
      street: "123 Main St",
      city: "San Francisco",
      state: "CA",
      zip: "94102",
      country: "USA",
    }),
    fRichText: "<p>Hello <strong>world</strong>! This is <em>rich text</em>.</p><ul><li>Item 1</li><li>Item 2</li></ul>",
    fFile: null,
    fSelect: "A",
    fMultiselect: JSON.stringify(["X", "Y"]),
    fReferenceId: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: "DT-002",
    fString: "Another string",
    fNumber: "3.14",
    fBoolean: false,
    fDate: new Date(now.getTime() - 86400000),
    fDatetime: new Date(now.getTime() - 3600000),
    fEmail: "demo@test.org",
    fPhone: "+44 20 7946 0958",
    fText: "More plain text.",
    fUrl: "www.github.com",
    fPassword: "demo-pass",
    fGeolocation: JSON.stringify({ latitude: 51.5074, longitude: -0.1278 }),
    fAddress: JSON.stringify({
      street: "10 Downing St",
      city: "London",
      state: "",
      zip: "SW1A 2AA",
      country: "UK",
    }),
    fRichText: "<p>Second record with <b>bold</b> and <i>italic</i>.</p>",
    fFile: null,
    fSelect: "B",
    fMultiselect: JSON.stringify(["Y"]),
    fReferenceId: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: "DT-003",
    fString: "Third record",
    fNumber: "100",
    fBoolean: true,
    fDate: now,
    fDatetime: now,
    fEmail: "third@example.net",
    fPhone: "+81 3-1234-5678",
    fText: "Third record text.",
    fUrl: "sub.domain.co.uk",
    fPassword: "test-pwd",
    fGeolocation: JSON.stringify({ latitude: 35.6762, longitude: 139.6503 }),
    fAddress: JSON.stringify({
      street: "1 Chome Marunouchi",
      city: "Tokyo",
      state: "",
      zip: "100-0005",
      country: "Japan",
    }),
    fRichText: "<p>Ordered list:</p><ol><li>First</li><li>Second</li><li>Third</li></ol>",
    fFile: null,
    fSelect: "A",
    fMultiselect: JSON.stringify(["X", "Y", "Z"]),
    fReferenceId: null,
    createdAt: now,
    updatedAt: now,
  },
];

async function main() {
  const existing = await db.select().from(deploytests);
  const existingNames = new Set(existing.map((r) => r.name));

  const toInsert = SAMPLE_RECORDS.filter((r) => !existingNames.has(r.name));
  if (toInsert.length === 0) {
    console.log("Deploytest records already exist. Skipping seed.");
    process.exit(0);
    return;
  }

  for (const record of toInsert) {
    try {
      await db.insert(deploytests).values(record as typeof deploytests.$inferInsert);
      console.log(`Inserted deploytest: ${record.name}`);
    } catch (err) {
      console.error(`Failed to insert ${record.name}:`, err);
      throw err;
    }
  }

  const total = await db.select().from(deploytests);
  console.log(`Done. Total deploytest records: ${total.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

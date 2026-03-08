import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "mysql://root:root@localhost:3306/btp_classification_platform";
const pool = mysql.createPool(connectionString);
export const db = drizzle(pool, { schema, mode: "default" });

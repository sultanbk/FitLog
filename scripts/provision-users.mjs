import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

try {
  const envFile = readFileSync(".env.local", "utf8");
  for (const row of envFile.split(/\r?\n/)) {
    const line = row.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsAt = line.indexOf("=");
    if (equalsAt < 1) continue;
    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
} catch { /* The variables can also be provided by the shell. */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before provisioning accounts.");
  process.exit(1);
}

const accounts = [
  { username: "tipu", displayName: "Tipu" },
  { username: "shrutikagk", displayName: "Shrutika GK" },
  { username: "saukan", displayName: "Saukan" },
];
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const existing = new Set();
for (let page = 1; ; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const user of data.users) if (user.email) existing.add(user.email.toLowerCase());
  if (data.users.length < 1000) break;
}

for (const account of accounts) {
  const email = `${account.username}@fitlog.local`;
  if (existing.has(email)) {
    console.log(`${account.username}: already exists; skipped. Reset its password in Supabase if needed.`);
    continue;
  }
  const password = randomBytes(18).toString("base64url");
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username: account.username, display_name: account.displayName } });
  if (error) throw error;
  console.log(`${account.username} initial password: ${password}`);
}
console.log("Give each password privately to its user. They can change it under Profile.");
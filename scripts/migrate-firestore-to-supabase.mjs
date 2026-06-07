/**
 * One-off migration: Firestore `courses` (aas-lms) → Supabase `lms_courses`.
 *
 * Requires: Firebase CLI login (`firebase login`) and Supabase service role in env.
 * Loads env from AASLMS/.env, AASADMIN/.env, AASWEB/.env (first match wins).
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

for (const rel of ['.env', '../AASADMIN/.env', '../AASWEB/.env']) {
  loadEnvFile(resolve(root, rel));
}

const FIRESTORE_PROJECT = 'aas-lms';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
const firebaseAuth = require(`${globalRoot}/firebase-tools/lib/auth.js`);
const firebaseScopes = require(`${globalRoot}/firebase-tools/lib/scopes.js`);

function parseFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(parseFirestoreValue);
  }
  if ('mapValue' in value) {
    const obj = {};
    for (const [key, field] of Object.entries(value.mapValue.fields ?? {})) {
      obj[key] = parseFirestoreValue(field);
    }
    return obj;
  }
  return null;
}

function parseFirestoreDoc(doc) {
  const legacyId = doc.name.split('/').pop();
  const data = {};
  for (const [key, field] of Object.entries(doc.fields ?? {})) {
    data[key] = parseFirestoreValue(field);
  }
  return { legacyId, ...data };
}

function toRow(doc) {
  const updatedAt = doc.updatedAt ?? new Date().toISOString();
  return {
    id: randomUUID(),
    legacy_firestore_id: doc.legacyId,
    name: String(doc.name ?? '').trim() || 'Untitled course',
    description: String(doc.description ?? '').trim(),
    author: String(doc.author ?? '').trim(),
    category: String(doc.category ?? '').trim(),
    image_url: doc.imageUrl ?? null,
    embed_token: doc.embedToken,
    modules: Array.isArray(doc.modules) ? doc.modules : [],
    created_at: updatedAt,
    updated_at: updatedAt,
  };
}

async function fetchFirestoreCourses() {
  const account = firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error('Not logged in to Firebase CLI. Run: firebase login');
  }

  const token = await firebaseAuth.getAccessToken(account.tokens.refresh_token, [
    firebaseScopes.CLOUD_PLATFORM,
  ]);

  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/courses`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore list failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return (data.documents ?? []).map(parseFirestoreDoc);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const courses = await fetchFirestoreCourses();

  console.log(`Found ${courses.length} course(s) in Firestore (${FIRESTORE_PROJECT}).`);

  if (courses.length === 0) {
    return;
  }

  const rows = courses.map(toRow);

  for (const row of rows) {
    const moduleCount = row.modules.length;
    console.log(`  • ${row.legacy_firestore_id}: ${row.name} (${moduleCount} modules)`);
    if (!row.embed_token) {
      console.warn(`    Warning: missing embed_token on ${row.legacy_firestore_id}`);
    }
  }

  if (dryRun) {
    console.log('Dry run — no writes.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: existingError } = await supabase
    .from('lms_courses')
    .select('legacy_firestore_id')
    .not('legacy_firestore_id', 'is', null);

  if (existingError) throw existingError;

  const existingIds = new Set((existing ?? []).map((r) => r.legacy_firestore_id));
  const toInsert = rows.filter((r) => !existingIds.has(r.legacy_firestore_id));
  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) {
    console.log(`All ${rows.length} course(s) already migrated (skipped ${skipped}).`);
    return;
  }

  const { error: insertError } = await supabase.from('lms_courses').insert(toInsert);
  if (insertError) throw insertError;

  console.log(`Migrated ${toInsert.length} course(s). Skipped ${skipped} already present.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

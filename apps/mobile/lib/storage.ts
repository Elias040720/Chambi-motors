import * as SQLite from "expo-sqlite";
import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import type { PhotoDraft } from "./types";

let database: ReturnType<typeof open> | undefined;
async function open() {
  const db = await SQLite.openDatabaseAsync("chambi-private-v1.db");
  await db.execAsync(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS local_records(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);",
  );
  return db;
}
function local() {
  database ??= open();
  return database;
}
export async function saveLocal(key: string, value: unknown) {
  await (
    await local()
  ).runAsync(
    "INSERT INTO local_records(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
    key,
    JSON.stringify(value),
    new Date().toISOString(),
  );
}
export async function readLocal<T>(key: string): Promise<{ value: T; updatedAt: string } | null> {
  const row = await (
    await local()
  ).getFirstAsync<{ value: string; updated_at: string }>(
    "SELECT value,updated_at FROM local_records WHERE key=?",
    key,
  );
  if (!row) return null;
  return { value: JSON.parse(row.value) as T, updatedAt: row.updated_at };
}
export async function removeLocal(key: string) {
  await (await local()).runAsync("DELETE FROM local_records WHERE key=?", key);
}
export async function clearLocal() {
  await (await local()).runAsync("DELETE FROM local_records");
  const directory = new Directory(Paths.document, "receipt-photos");
  if (directory.exists) directory.delete();
}
export async function keepPhoto(uri: string, mime?: string): Promise<PhotoDraft> {
  const directory = new Directory(Paths.document, "receipt-photos");
  directory.create({ idempotent: true, intermediates: true });
  const format = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const name = `${Crypto.randomUUID()}.${format}`;
  const file = new File(directory, name);
  new File(uri).copy(file);
  return { uri: file.uri, mime: mime ?? "image/jpeg", name };
}
export function discardPhoto(photo?: PhotoDraft) {
  if (!photo) return;
  const file = new File(photo.uri);
  if (file.exists) file.delete();
}

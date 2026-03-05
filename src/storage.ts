/**
 * cellar-door-exit — Local Marker Storage
 *
 * Filesystem-based, non-custodial. The agent/owner holds their own markers.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { validateMarker } from "./validate.js";
import type { ExitMarker } from "./types.js";
import type { AmendmentMarker, RevocationMarker } from "./amendment.js";

/**
 * Validate that a storage directory path is safe (no path traversal via `..`).
 * @throws {Error} If the path contains traversal components.
 */
function validateDir(dir: string): string {
  const resolved = resolve(dir);
  // Reject paths containing ".." components
  const parts = dir.split(/[/\\]/);
  if (parts.includes("..")) {
    throw new Error(`Unsafe storage directory: path contains '..' traversal: ${dir}`);
  }
  return resolved;
}

/**
 * Save a marker to local storage as `{dir}/{markerId}.json`.
 *
 * @param marker - The EXIT marker to save.
 * @param dir - The directory path for storage (created if it doesn't exist).
 * @returns The full file path where the marker was saved.
 */
export function saveMarker(marker: ExitMarker, dir: string): string {
  dir = validateDir(dir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  // Use the marker id, but sanitize for filesystem
  const safeId = marker.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = join(dir, `${safeId}.json`);
  writeFileSync(filePath, JSON.stringify(marker, null, 2), "utf-8");
  return filePath;
}

/**
 * Load a marker by id from local storage. Validates on load.
 *
 * @param id - The marker ID to load.
 * @param dir - The storage directory path.
 * @returns The loaded and validated EXIT marker.
 * @throws {Error} If the file doesn't exist or the marker fails validation.
 */
export function loadMarker(id: string, dir: string): ExitMarker {
  dir = validateDir(dir);
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = join(dir, `${safeId}.json`);
  const raw = readFileSync(filePath, "utf-8");
  const marker = JSON.parse(raw) as ExitMarker;
  const result = validateMarker(marker);
  if (!result.valid) {
    throw new Error(`Invalid marker ${id}: ${result.errors.join(", ")}`);
  }
  return marker;
}

/**
 * List all stored marker IDs in a directory.
 *
 * @param dir - The storage directory path.
 * @returns An array of marker IDs (filenames without `.json` extension). Empty if directory doesn't exist.
 */
export function listMarkers(dir: string): string[] {
  dir = validateDir(dir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

/**
 * Delete a marker by ID from local storage.
 *
 * @param id - The marker ID to delete.
 * @param dir - The storage directory path.
 * @returns `true` if the file was deleted, `false` if it didn't exist.
 */
export function deleteMarker(id: string, dir: string): boolean {
  dir = validateDir(dir);
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = join(dir, `${safeId}.json`);
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}

/**
 * Export a marker as a portable JSON string.
 *
 * @param marker - The EXIT marker to export.
 * @returns A pretty-printed JSON string.
 */
export function exportMarker(marker: ExitMarker): string {
  return JSON.stringify(marker, null, 2);
}

/**
 * Import a marker from a JSON string. Validates before returning.
 *
 * @param json - The JSON string to parse.
 * @returns The validated EXIT marker.
 * @throws {Error} If the JSON is invalid or the marker fails validation.
 */
/** Maximum JSON input size for parsing (1 MB). */
const MAX_JSON_SIZE = 1_048_576;

/**
 * Save an amendment to local storage under `{dir}/amendments/{originalMarkerId}/`.
 */
export function saveAmendment(amendment: AmendmentMarker, dir: string): string {
  dir = validateDir(dir);
  const subdir = join(dir, "amendments", amendment.originalMarkerId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  if (!existsSync(subdir)) mkdirSync(subdir, { recursive: true });
  const safeId = amendment.amendmentId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = join(subdir, `${safeId}.json`);
  writeFileSync(filePath, JSON.stringify(amendment, null, 2), "utf-8");
  return filePath;
}

/**
 * Load all amendments for a given original marker ID.
 */
export function loadAmendments(originalMarkerId: string, dir: string): AmendmentMarker[] {
  dir = validateDir(dir);
  const subdir = join(dir, "amendments", originalMarkerId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  if (!existsSync(subdir)) return [];
  return readdirSync(subdir)
    .filter(f => f.endsWith(".json"))
    .map(f => JSON.parse(readFileSync(join(subdir, f), "utf-8")) as AmendmentMarker);
}

/**
 * Save a revocation to local storage under `{dir}/revocations/`.
 */
export function saveRevocation(revocation: RevocationMarker, dir: string): string {
  dir = validateDir(dir);
  const subdir = join(dir, "revocations", revocation.targetMarkerId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  if (!existsSync(subdir)) mkdirSync(subdir, { recursive: true });
  const safeId = revocation.revocationId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = join(subdir, `${safeId}.json`);
  writeFileSync(filePath, JSON.stringify(revocation, null, 2), "utf-8");
  return filePath;
}

/**
 * Load all revocations for a given target marker ID.
 */
export function loadRevocations(targetMarkerId: string, dir: string): RevocationMarker[] {
  dir = validateDir(dir);
  const subdir = join(dir, "revocations", targetMarkerId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  if (!existsSync(subdir)) return [];
  return readdirSync(subdir)
    .filter(f => f.endsWith(".json"))
    .map(f => JSON.parse(readFileSync(join(subdir, f), "utf-8")) as RevocationMarker);
}

export function importMarker(json: string): ExitMarker {
  if (json.length > MAX_JSON_SIZE) {
    throw new Error(`JSON input too large: ${json.length} chars (max ${MAX_JSON_SIZE})`);
  }
  const marker = JSON.parse(json) as ExitMarker;
  const result = validateMarker(marker);
  if (!result.valid) {
    throw new Error(`Invalid marker: ${result.errors.join(", ")}`);
  }
  return marker;
}

/**
 * cellar-door-exit — Local Marker Storage
 *
 * Filesystem-based, non-custodial. The agent/owner holds their own markers.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { validateMarker } from "./validate.js";
import type { ExitMarker } from "./types.js";

/**
 * Save a marker to local storage as `{dir}/{markerId}.json`.
 *
 * @param marker - The EXIT marker to save.
 * @param dir - The directory path for storage (created if it doesn't exist).
 * @returns The full file path where the marker was saved.
 */
export function saveMarker(marker: ExitMarker, dir: string): string {
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
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
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
export function importMarker(json: string): ExitMarker {
  const marker = JSON.parse(json) as ExitMarker;
  const result = validateMarker(marker);
  if (!result.valid) {
    throw new Error(`Invalid marker: ${result.errors.join(", ")}`);
  }
  return marker;
}

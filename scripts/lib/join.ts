import type { JoinedRestaurant, RawCsvRow, RawJsonRestaurant } from './types.js';

export interface JoinReport {
  joined: JoinedRestaurant[];
  /** IDs present in the JSON file with no matching CSV row. */
  jsonOnly: string[];
  /** IDs present in the CSV file with no matching JSON record. */
  csvOnly: string[];
  duplicateJsonIds: string[];
  duplicateCsvIds: string[];
}

/**
 * Joins the two files on `objectID`.
 *
 * The key is an integer in the JSON and a string in the CSV, so both sides are coerced to
 * string before matching. That is also the shape Algolia requires, so the join key and the
 * final `objectID` are the same value — there is no second coercion later to get wrong.
 */
export function joinOnObjectId(
  jsonRecords: RawJsonRestaurant[],
  csvRows: RawCsvRow[],
): JoinReport {
  const jsonById = indexByObjectId(jsonRecords, (record) => String(record.objectID));
  const csvById = indexByObjectId(csvRows, (row) => row.objectID);

  const joined: JoinedRestaurant[] = [];
  const jsonOnly: string[] = [];

  for (const [objectID, json] of jsonById.byId) {
    const csv = csvById.byId.get(objectID);
    if (csv === undefined) {
      jsonOnly.push(objectID);
      continue;
    }
    joined.push({ objectID, json, csv });
  }

  const csvOnly = [...csvById.byId.keys()].filter((objectID) => !jsonById.byId.has(objectID));

  return {
    joined,
    jsonOnly,
    csvOnly,
    duplicateJsonIds: jsonById.duplicates,
    duplicateCsvIds: csvById.duplicates,
  };
}

/**
 * The join is only trustworthy if it is total. A partial join would quietly ship an index
 * missing cuisine or rating data, so anything less than a perfect match stops the build.
 */
export function assertCleanJoin(report: JoinReport, expectedCount: number): void {
  const problems: string[] = [];

  if (report.joined.length !== expectedCount) {
    problems.push(`joined ${report.joined.length} records, expected ${expectedCount}`);
  }
  if (report.jsonOnly.length > 0) {
    problems.push(`${report.jsonOnly.length} JSON records have no CSV row (e.g. ${report.jsonOnly.slice(0, 5).join(', ')})`);
  }
  if (report.csvOnly.length > 0) {
    problems.push(`${report.csvOnly.length} CSV rows have no JSON record (e.g. ${report.csvOnly.slice(0, 5).join(', ')})`);
  }
  if (report.duplicateJsonIds.length > 0) {
    problems.push(`duplicate objectIDs in JSON: ${report.duplicateJsonIds.slice(0, 5).join(', ')}`);
  }
  if (report.duplicateCsvIds.length > 0) {
    problems.push(`duplicate objectIDs in CSV: ${report.duplicateCsvIds.slice(0, 5).join(', ')}`);
  }

  if (problems.length > 0) {
    throw new Error(`join is not clean:\n  - ${problems.join('\n  - ')}`);
  }
}

function indexByObjectId<T>(
  items: T[],
  getId: (item: T) => string,
): { byId: Map<string, T>; duplicates: string[] } {
  const byId = new Map<string, T>();
  const duplicates: string[] = [];

  for (const item of items) {
    const id = getId(item);
    if (byId.has(id)) {
      duplicates.push(id);
      continue;
    }
    byId.set(id, item);
  }

  return { byId, duplicates };
}

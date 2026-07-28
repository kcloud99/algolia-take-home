import { readFileSync } from 'node:fs';
import { paths } from './paths.js';
import type { RawCsvRow, RawJsonRestaurant } from './types.js';

const CSV_DELIMITER = ';';

/** Column order the CSV is expected to arrive in. Asserted on load, not assumed. */
const CSV_COLUMNS = [
  'objectID',
  'food_type',
  'stars_count',
  'reviews_count',
  'neighborhood',
  'phone_number',
  'price_range',
  'dining_style',
] as const satisfies readonly (keyof RawCsvRow)[];

export interface CsvLoadResult {
  rows: RawCsvRow[];
  /** Fields that arrived with surrounding whitespace. Reported because it is a data-quality signal. */
  trimmedFields: number;
}

export function loadJsonRestaurants(): RawJsonRestaurant[] {
  const parsed: unknown = JSON.parse(readFileSync(paths.rawRestaurantsJson, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error('restaurants_list.json did not contain a JSON array');
  }
  return parsed as RawJsonRestaurant[];
}

export function loadCsvRows(): CsvLoadResult {
  return parseSemicolonCsv(readFileSync(paths.rawRestaurantsCsv, 'utf8'));
}

/**
 * The file uses no quoting at all — verified: zero `"` characters, and all 5,001 lines
 * split into exactly 8 fields. A delimiter split is therefore exact, and the assertions
 * below turn any future violation into a loud failure rather than a silent misparse.
 *
 * Values are trimmed on the way in: six `neighborhood` values carry a leading space, which
 * would otherwise produce " Noblesville" and "Noblesville" as two separate facet values.
 */
function parseSemicolonCsv(text: string): CsvLoadResult {
  const lines = text.split('\n').filter((line) => line.length > 0);
  const [headerLine, ...dataLines] = lines;

  if (headerLine === undefined) {
    throw new Error('restaurants_info.csv is empty');
  }

  const header = headerLine.split(CSV_DELIMITER).map((column) => column.trim());
  if (header.join(CSV_DELIMITER) !== CSV_COLUMNS.join(CSV_DELIMITER)) {
    throw new Error(
      `restaurants_info.csv header changed.\n  expected: ${CSV_COLUMNS.join(CSV_DELIMITER)}\n  found:    ${header.join(CSV_DELIMITER)}`,
    );
  }

  let trimmedFields = 0;

  const rows = dataLines.map((line, index) => {
    const lineNumber = index + 2; // 1-based, and the header occupies line 1

    if (line.includes('"')) {
      throw new Error(
        `restaurants_info.csv line ${lineNumber} contains a quote character; ` +
          'the delimiter-split parser is no longer safe for this file',
      );
    }

    const fields = line.split(CSV_DELIMITER);
    if (fields.length !== CSV_COLUMNS.length) {
      throw new Error(
        `restaurants_info.csv line ${lineNumber} has ${fields.length} fields, expected ${CSV_COLUMNS.length}`,
      );
    }

    const row: Record<string, string> = {};
    CSV_COLUMNS.forEach((column, position) => {
      const value = fields[position] ?? ''; // length is asserted above; the fallback never fires
      const trimmed = value.trim();
      if (trimmed !== value) trimmedFields += 1;
      row[column] = trimmed;
    });

    return row as unknown as RawCsvRow;
  });

  return { rows, trimmedFields };
}

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { normalizeVendorRole, type VendorRole } from "./vendors";

export type VendorImportRow = {
  name: string;
  role: VendorRole;
  phone: string | null;
  email: string | null;
  notes: string | null;
  /** 1-based spreadsheet row number for error reporting */
  rowNumber: number;
};

export type ParsedVendorImport = {
  rows: VendorImportRow[];
  skippedEmpty: number;
  warnings: string[];
};

/** Flexible header aliases (normalized: lowercased, non-alnum → space). */
const HEADER_ALIASES: Record<string, keyof Omit<VendorImportRow, "rowNumber">> = {
  name: "name",
  "vendor name": "name",
  vendor: "name",
  company: "name",
  "company name": "name",
  "contact name": "name",
  role: "role",
  type: "role",
  category: "role",
  "vendor role": "role",
  "vendor type": "role",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  cell: "phone",
  telephone: "phone",
  tel: "phone",
  email: "email",
  "e mail": "email",
  "email address": "email",
  notes: "notes",
  note: "notes",
  comments: "notes",
  comment: "notes",
  memo: "notes",
};

function normalizeHeader(h: string): string {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/\s+/g, " ");
}

function mapHeaders(headers: string[]): {
  map: Partial<Record<keyof Omit<VendorImportRow, "rowNumber">, number>>;
  warnings: string[];
} {
  const map: Partial<Record<keyof Omit<VendorImportRow, "rowNumber">, number>> = {};
  const warnings: string[] = [];
  headers.forEach((h, i) => {
    const key = HEADER_ALIASES[normalizeHeader(h)];
    if (!key) return;
    if (map[key] !== undefined) {
      warnings.push(`Duplicate column for "${key}" — using first match.`);
      return;
    }
    map[key] = i;
  });
  return { map, warnings };
}

function cell(row: unknown[], idx: number | undefined): string {
  if (idx === undefined) return "";
  const v = row[idx];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function rowsFromMatrix(matrix: unknown[][]): ParsedVendorImport {
  const warnings: string[] = [];
  if (!matrix.length) {
    return { rows: [], skippedEmpty: 0, warnings: ["File is empty."] };
  }

  // Find first non-empty row as header
  let headerIdx = 0;
  while (
    headerIdx < matrix.length &&
    !(matrix[headerIdx] || []).some((c) => String(c ?? "").trim())
  ) {
    headerIdx++;
  }
  if (headerIdx >= matrix.length) {
    return { rows: [], skippedEmpty: 0, warnings: ["File is empty."] };
  }

  const headerRow = (matrix[headerIdx] || []).map((c) => String(c ?? ""));
  const { map, warnings: headerWarnings } = mapHeaders(headerRow);
  warnings.push(...headerWarnings);

  if (map.name === undefined) {
    warnings.push(
      'No "name" column found. Expected headers like: name, role, phone, email, notes.'
    );
    return { rows: [], skippedEmpty: 0, warnings };
  }

  const rows: VendorImportRow[] = [];
  let skippedEmpty = 0;

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const raw = matrix[i] || [];
    const isBlank = !raw.some((c) => String(c ?? "").trim());
    if (isBlank) continue;

    const name = cell(raw, map.name);
    if (!name) {
      skippedEmpty++;
      continue;
    }

    const roleRaw = cell(raw, map.role);
    const phone = cell(raw, map.phone) || null;
    const email = cell(raw, map.email) || null;
    const notes = cell(raw, map.notes) || null;

    rows.push({
      name,
      role: normalizeVendorRole(roleRaw),
      phone,
      email,
      notes,
      rowNumber: i + 1, // 1-based for humans
    });
  }

  return { rows, skippedEmpty, warnings };
}

/** Parse CSV text (or ArrayBuffer as UTF-8) into vendor rows. */
export function parseVendorCsv(input: string | ArrayBuffer): ParsedVendorImport {
  const text =
    typeof input === "string"
      ? input
      : new TextDecoder("utf-8").decode(input);
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
  });
  if (parsed.errors?.length) {
    const warnings = parsed.errors
      .slice(0, 5)
      .map((e) => `CSV parse: ${e.message}${e.row != null ? ` (row ${e.row})` : ""}`);
    const matrix = (parsed.data || []) as unknown[][];
    const result = rowsFromMatrix(matrix);
    return { ...result, warnings: [...warnings, ...result.warnings] };
  }
  return rowsFromMatrix((parsed.data || []) as unknown[][]);
}

/** Parse .xlsx / .xls first sheet into vendor rows. */
export function parseVendorExcel(buffer: ArrayBuffer): ParsedVendorImport {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], skippedEmpty: 0, warnings: ["Workbook has no sheets."] };
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  return rowsFromMatrix(matrix);
}

export function parseVendorFile(
  file: File,
  buffer: ArrayBuffer
): ParsedVendorImport {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return parseVendorCsv(buffer);
  }
  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type.includes("spreadsheet") ||
    file.type.includes("excel")
  ) {
    return parseVendorExcel(buffer);
  }
  // Heuristic: try CSV first
  try {
    const asCsv = parseVendorCsv(buffer);
    if (asCsv.rows.length || !asCsv.warnings.some((w) => w.includes("No \"name\""))) {
      return asCsv;
    }
  } catch {
    /* fall through */
  }
  try {
    return parseVendorExcel(buffer);
  } catch {
    return {
      rows: [],
      skippedEmpty: 0,
      warnings: ["Unsupported file type. Use .csv, .xlsx, or .xls."],
    };
  }
}

export const VENDOR_CSV_TEMPLATE = `name,role,phone,email,notes
Bright Clean Co.,cleaner,(512) 555-0100,hello@brightclean.example,Preferred Tue/Thu mornings
Lens & Light Photo,photographer,(512) 555-0200,book@lenslight.example,Drone available
`;

export function downloadVendorCsvTemplate() {
  const blob = new Blob([VENDOR_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vendor-import-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

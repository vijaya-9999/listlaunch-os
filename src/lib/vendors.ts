export const VENDOR_ROLES = [
  "cleaner",
  "stager",
  "handyman",
  "photographer",
  "landscaper",
  "other",
] as const;

export type VendorRole = (typeof VENDOR_ROLES)[number];

export const VENDOR_ROLE_LABELS: Record<VendorRole, string> = {
  cleaner: "Cleaner",
  stager: "Stager",
  handyman: "Handyman",
  photographer: "Photographer",
  landscaper: "Landscaper",
  other: "Other",
};

export const CONFIRM_STATUSES = ["pending", "confirmed", "declined"] as const;
export type ConfirmStatus = (typeof CONFIRM_STATUSES)[number];

export function isVendorRole(v: string): v is VendorRole {
  return (VENDOR_ROLES as readonly string[]).includes(v);
}

/** Case-insensitive role aliases → canonical VendorRole. Unknown → other. */
const ROLE_ALIASES: Record<string, VendorRole> = {
  cleaner: "cleaner",
  cleaners: "cleaner",
  cleaning: "cleaner",
  clean: "cleaner",
  "house cleaner": "cleaner",
  "house cleaning": "cleaner",
  maid: "cleaner",
  stager: "stager",
  staging: "stager",
  "home stager": "stager",
  "home staging": "stager",
  handyman: "handyman",
  handy: "handyman",
  repair: "handyman",
  repairs: "handyman",
  contractor: "handyman",
  photographer: "photographer",
  photo: "photographer",
  photography: "photographer",
  "real estate photographer": "photographer",
  landscaper: "landscaper",
  landscaping: "landscaper",
  landscape: "landscaper",
  lawn: "landscaper",
  other: "other",
  misc: "other",
  miscellaneous: "other",
};

export function normalizeVendorRole(raw: string | null | undefined): VendorRole {
  const key = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (!key) return "other";
  if (isVendorRole(key)) return key;
  return ROLE_ALIASES[key] ?? "other";
}

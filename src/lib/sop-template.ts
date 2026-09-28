/**
 * Default ListLaunch SOP — seed source for each user's workspace template.
 * New launches clone FROM the user's DB template (not this file directly).
 * Source: /workspace/listlaunch-os-mvp.md Phase 0–6 tables.
 */

export type OwnerType = "Agent" | "Coord" | "Seller" | "Vendor" | "System";

export const OWNER_TYPES: OwnerType[] = [
  "Agent",
  "Coord",
  "Seller",
  "Vendor",
  "System",
];

export type SopTaskDef = {
  title: string;
  ownerType: OwnerType;
  key: string;
  /** Days relative to go-live for suggested due date (negative = before). Null = no due. */
  dueOffsetDays?: number | null;
  /** If true, this task must be done/na before Photo Day phase unlocks */
  blocksPhoto?: boolean;
  /** If true, this task must be done/na before Live phase unlocks */
  blocksLive?: boolean;
};

export type SopPhaseDef = {
  key: string;
  name: string;
  order: number;
  /** Tasks in this phase stay locked until all blocksPhoto tasks are done/na */
  isPhotoPhase?: boolean;
  /** Tasks in this phase stay locked until all blocksLive tasks are done/na */
  isLivePhase?: boolean;
  tasks: SopTaskDef[];
};

export const DEFAULT_SOP: SopPhaseDef[] = [
  {
    key: "intake",
    name: "Phase 0 — Intake",
    order: 0,
    tasks: [
      { title: "Listing agreement signed & filed", ownerType: "Agent", key: "agreement_signed", dueOffsetDays: 0 },
      { title: "Seller goals + target live date confirmed", ownerType: "Agent", key: "goals_confirmed", dueOffsetDays: 0 },
      { title: "Disclosures requested", ownerType: "Coord", key: "disclosures_requested", dueOffsetDays: -14 },
      { title: "HOA docs requested (if applicable)", ownerType: "Coord", key: "hoa_docs_requested", dueOffsetDays: -14 },
      { title: "Access: lockbox / gate / alarm / pets notes", ownerType: "Agent", key: "access_notes", dueOffsetDays: -10, blocksPhoto: true },
      { title: "Walkthrough punch list written", ownerType: "Agent", key: "punch_list", dueOffsetDays: -12 },
    ],
  },
  {
    key: "repairs",
    name: "Phase 1 — Repairs & prep",
    order: 1,
    tasks: [
      { title: "Punch list sent to seller", ownerType: "Agent", key: "punch_sent", dueOffsetDays: -11 },
      { title: "Handyman booked", ownerType: "Coord", key: "handyman_booked", dueOffsetDays: -9 },
      { title: "Landscaping booked (if needed)", ownerType: "Coord", key: "landscaping_booked", dueOffsetDays: -7 },
      { title: "Declutter / storage haul (if needed)", ownerType: "Seller", key: "declutter", dueOffsetDays: -8 },
    ],
  },
  {
    key: "clean",
    name: "Phase 2 — Clean",
    order: 2,
    tasks: [
      { title: "Cleaner booked after repairs", ownerType: "Coord", key: "cleaner_booked", dueOffsetDays: -6 },
      { title: "Clean complete confirmed", ownerType: "Vendor", key: "clean_complete", dueOffsetDays: -5, blocksPhoto: true },
    ],
  },
  {
    key: "stage",
    name: "Phase 3 — Stage",
    order: 3,
    tasks: [
      { title: "Staging consult done", ownerType: "Coord", key: "staging_consult", dueOffsetDays: -7 },
      { title: "Stage install complete", ownerType: "Vendor", key: "stage_complete", dueOffsetDays: -4, blocksPhoto: true },
      { title: "Vacant? Virtual staging decision logged", ownerType: "Agent", key: "virtual_staging", dueOffsetDays: -4 },
    ],
  },
  {
    key: "photo",
    name: "Phase 4 — Photo day",
    order: 4,
    isPhotoPhase: true,
    tasks: [
      { title: "Photographer booked (buffer: ≥24–48h before live)", ownerType: "Coord", key: "photographer_booked", dueOffsetDays: -3 },
      { title: "Day-before confirm SMS sent & replied", ownerType: "System", key: "photo_confirm_sms", dueOffsetDays: -2 },
      { title: "Access packet reviewed by vendor", ownerType: "Vendor", key: "access_packet_reviewed", dueOffsetDays: -2 },
      { title: "Media delivered", ownerType: "Vendor", key: "media_delivered", dueOffsetDays: -1 },
      { title: "Agent/seller media approval", ownerType: "Agent", key: "media_approved", dueOffsetDays: -1 },
    ],
  },
  {
    key: "mls_qa",
    name: "Phase 5 — MLS QA",
    order: 5,
    tasks: [
      { title: "Facts verified (beds/baths/SF/taxes/HOA)", ownerType: "Coord", key: "facts_verified", dueOffsetDays: -1 },
      { title: "Remarks drafted", ownerType: "Agent", key: "remarks_drafted", dueOffsetDays: -1 },
      { title: "Showing instructions + offer instructions set", ownerType: "Agent", key: "showing_instructions", dueOffsetDays: 0 },
      { title: "Disclosures attached / checklist complete", ownerType: "Coord", key: "disclosures_attached", dueOffsetDays: 0 },
      { title: "Photo order set", ownerType: "Coord", key: "photo_order", dueOffsetDays: 0 },
      { title: "Ready-for-MLS sign-off", ownerType: "Agent", key: "mls_signoff", dueOffsetDays: 0, blocksLive: true },
    ],
  },
  {
    key: "golive",
    name: "Phase 6 — Go-live day",
    order: 6,
    isLivePhase: true,
    tasks: [
      { title: "MLS activated (agent does in MLS)", ownerType: "Agent", key: "mls_activated", dueOffsetDays: 0 },
      { title: "Syndication spot-check (Zillow/Realtor.com)", ownerType: "Coord", key: "syndication_check", dueOffsetDays: 0 },
      { title: "Seller notified \"you're live\"", ownerType: "Agent", key: "seller_notified_live", dueOffsetDays: 0 },
      { title: "Just Listed blast / social (checklist only)", ownerType: "Agent", key: "just_listed", dueOffsetDays: 0 },
      { title: "Sign / lockbox verified on site", ownerType: "Agent", key: "sign_lockbox", dueOffsetDays: 0 },
    ],
  },
];

/** @deprecated Prefer blocksPhoto flags on tasks; kept for backfill / docs */
export const PHOTO_DAY_PREREQ_KEYS = [
  "clean_complete",
  "stage_complete",
  "access_notes",
] as const;

export const PHOTO_DAY_PHASE_KEY = "photo";
export const LIVE_PHASE_KEY = "golive";

import core from "./core/fixture.json";
import audit from "./campaigns/audit/fixture.json";
import type { CampaignPackage } from "./schemas";

// Register packages in dependency order. Mode selectors derive their campaign
// entries from this list, so adding a package does not require UI edits.
export const CAMPAIGN_CATALOG: CampaignPackage[] = [
  core as CampaignPackage,
  audit as CampaignPackage,
];

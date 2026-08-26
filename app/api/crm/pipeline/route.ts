export const dynamic = "force-dynamic";
import { respond } from "../db";

export async function GET() {
  return respond((db) =>
    db
      .from("deals")
      .select("id, company, value, stage, probability, days_in_stage, team_members(name)")
      .order("created_at", { ascending: false })
  );
}

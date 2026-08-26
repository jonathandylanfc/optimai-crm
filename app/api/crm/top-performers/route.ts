export const dynamic = "force-dynamic";
import { respond } from "../db";

export async function GET() {
  return respond((db) =>
    db.from("deals").select("value, team_member_id, team_members(id, name)").eq("stage", "closed_won")
  );
}

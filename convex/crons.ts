import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "sync skills",
  { hourUTC: 6, minuteUTC: 0 },
  internal.skills.syncSkills,
);

export default crons;

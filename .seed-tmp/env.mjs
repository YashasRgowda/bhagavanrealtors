import fs from "node:fs";
export function envOf(dir) {
  return Object.fromEntries(fs.readFileSync(dir + "/.env.local", "utf8").split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
}
export const BHAGVAN = "/Users/yashasr/Documents/Projects/freelancing/real-estate/V_localrealtors_demo";
export const ADITYA  = "/Users/yashasr/Documents/Projects/freelancing/real-estate/aditya_developers";

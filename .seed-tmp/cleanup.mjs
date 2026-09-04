/* Removes ONLY the demo listings + buyers moved over from Aditya.
   Your original listing is identified by having no _seed tag and is never
   touched. Run:  node .seed-tmp/cleanup.mjs                              */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { envOf, BHAGVAN } from "./env.mjs";
const e = envOf(BHAGVAN);
const BUCKET = e.NEXT_PUBLIC_STORAGE_BUCKET || "property-media";
const sb = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY,
  { auth:{autoRefreshToken:false,persistSession:false} });
const man = JSON.parse(fs.readFileSync(BHAGVAN + "/.seed-tmp/manifest.json","utf8"));

const { data: props } = await sb.from("properties").select("id,title,attributes");
const demo = props.filter(p => p.attributes?._seed === "demo-data");
const keeping = props.filter(p => p.attributes?._seed !== "demo-data");
console.log("keeping:", keeping.map(p => p.title ?? "(untitled)").join(", ") || "none");

if (demo.length) {
  const ids = demo.map(p => p.id);
  const { data: media } = await sb.from("property_media").select("storage_path").in("property_id", ids);
  const paths = (media ?? []).flatMap(m => [m.storage_path, m.storage_path.replace(/\.jpg$/,"-thumb.jpg")]);
  if (paths.length) await sb.storage.from(BUCKET).remove(paths);
  const { error } = await sb.from("properties").delete().in("id", ids);
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`removed ${ids.length} demo properties and ${paths.length} files`);
}
if (man.requirements?.length) {
  await sb.from("requirements").delete().in("id", man.requirements);
  console.log(`removed ${man.requirements.length} buyers`);
}
console.log("done — your own listing untouched.");

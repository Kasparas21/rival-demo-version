import fs from "node:fs";
import { execSync } from "node:child_process";

const files = execSync('rg -l "getRequestWorkspace" src/app/api', { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

const return401 = String.raw`return NextResponse\.json\(\{[^}]+\}, \{ status: 401 \}\);`;

const patterns = [
  new RegExp(
    String.raw`const supabase = await createSupabaseServerClient\(\);\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(!user\) \{\s*\n\s*${return401}\s*\n\s*\}\s*\n\s*\n`,
    "g",
  ),
  new RegExp(
    String.raw`const supabase = await createSupabaseServerClient\(\);\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*error: authErr,\s*\n\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(authErr \|\| !user\) \{\s*\n\s*${return401}\s*\n\s*\}\s*\n\s*\n`,
    "g",
  ),
  new RegExp(
    String.raw`const supabase = await createSupabaseServerClient\(\);\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*error,\s*\n\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(error \|\| !user\) \{\s*\n\s*${return401}\s*\n\s*\}\s*\n\s*\n`,
    "g",
  ),
];

let changed = 0;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const orig = src;

  for (const re of patterns) {
    src = src.replace(re, "");
  }

  if (
    src.includes('from "@/lib/supabase/server"') &&
    !src.includes("createSupabaseServerClient(")
  ) {
    src = src.replace(
      /import \{ createSupabaseServerClient \} from "@\/lib\/supabase\/server";\n?/g,
      "",
    );
  }

  if (src !== orig) {
    fs.writeFileSync(file, src);
    changed += 1;
    console.log("fixed", file);
  }
}

console.log("total", changed);

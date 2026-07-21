import fs from "node:fs";
import { execSync } from "node:child_process";

const files = execSync('rg -l "getRequestWorkspace" src/app/api', { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

const oldAuthBeforeWorkspaceRe =
  /const supabase = await createSupabaseServerClient\(\);\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*(?:error(?:: authErr)?,\s*\n\s*)?\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \((?:authErr \|\| )?!user(?: \|\| authErr)?\) \{\s*\n\s*return NextResponse\.json\([^)]+\), \{ status: 401 \}\);\s*\n\s*\}\s*\n\s*\n/g;

let changed = 0;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const orig = src;

  if (src.includes("getRequestWorkspace()") && /const supabase = await createSupabaseServerClient/.test(src)) {
    src = src.replace(oldAuthBeforeWorkspaceRe, "");
  }

  // Remove redundant dataUserId reassignment anywhere after destructuring dataUserId from workspace
  if (/const \{[^}]*dataUserId[^}]*\} = workspace;/.test(src)) {
    src = src.replace(/\n\s*const dataUserId = ctx\.dataUserId;/g, "");
  }

  // Remove unused createSupabaseServerClient import if no longer referenced
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

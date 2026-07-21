import fs from "node:fs";
import { execSync } from "node:child_process";

const skip = new Set([
  "src/app/api/team/invite/route.ts",
  "src/app/api/team/switch-workspace/route.ts",
  "src/app/api/team/members/route.ts",
  "src/app/api/team/members/[id]/route.ts",
  "src/app/api/team/accept/route.ts",
  "src/app/api/team/context/route.ts",
  "src/app/api/account/brands/route.ts",
  "src/app/api/account/usage/route.ts",
]);

const files = execSync('rg -l "resolveWorkspaceContext\\(supabase, user\\.id\\)" src/app/api', {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

const workspaceBlock = `const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;`;

const authBlockRe =
  /const supabase = await createSupabaseServerClient\(\);\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\s*\n\s*\}\s*\n\s*\n\s*const ctx = await resolveWorkspaceContext\(supabase, user\.id\);\s*\n\s*const dataUserId = ctx\.dataUserId;/g;

const authBlockRe2 =
  /const supabase = await createSupabaseServerClient\(\);\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*error,\s*\n\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(error \|\| !user\) \{\s*\n\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\s*\n\s*\}\s*\n\s*\n\s*const ctx = await resolveWorkspaceContext\(supabase, user\.id\);\s*\n\s*const dataUserId = ctx\.dataUserId;/g;

function ensureImport(src) {
  if (src.includes('@/lib/team/session-workspace"')) return src;
  if (src.includes("resolveWorkspaceContext, type WorkspaceContext")) {
    return src.replace(
      'import { resolveWorkspaceContext, type WorkspaceContext } from "@/lib/team/workspace-context";',
      'import { getRequestWorkspace } from "@/lib/team/session-workspace";\nimport type { WorkspaceContext } from "@/lib/team/workspace-context";',
    );
  }
  return src.replace(
    'import { resolveWorkspaceContext } from "@/lib/team/workspace-context";',
    'import { getRequestWorkspace } from "@/lib/team/session-workspace";',
  );
}

let changed = 0;
for (const file of files) {
  if (skip.has(file)) continue;
  let src = fs.readFileSync(file, "utf8");
  const orig = src;
  src = src.replace(authBlockRe, workspaceBlock);
  src = src.replace(authBlockRe2, workspaceBlock);
  src = ensureImport(src);
  if (src !== orig) {
    fs.writeFileSync(file, src);
    changed += 1;
    console.log("updated", file);
  }
}
console.log("total", changed);

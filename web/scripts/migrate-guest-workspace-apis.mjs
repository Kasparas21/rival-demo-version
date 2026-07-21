import fs from "node:fs";
import { execSync } from "node:child_process";

const skip = new Set([
  "src/app/api/team/invite/route.ts",
  "src/app/api/team/switch-workspace/route.ts",
  "src/app/api/team/members/route.ts",
  "src/app/api/team/members/[id]/route.ts",
  "src/app/api/team/accept/route.ts",
]);

const files = execSync('rg -l "resolveWorkspaceContext\\\\(supabase" src/app/api', {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

const replaceBlock = `const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;`;

const patterns = [
  /const supabase = await createSupabaseServerClient\(\);\n  const \{\n    data: \{ user \},\n  \} = await supabase\.auth\.getUser\(\);\n  if \(!user\) \{\n    return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\n  \}\n\n  const ctx = await resolveWorkspaceContext\(supabase, user\.id\);/g,
  /const supabase = await createSupabaseServerClient\(\);\n  const \{\n    data: \{ user \},\n    error,\n  \} = await supabase\.auth\.getUser\(\);\n\n  if \(error \|\| !user\) \{\n    return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\n  \}\n\n  const ctx = await resolveWorkspaceContext\(supabase, user\.id\);/g,
  /const supabase = await createSupabaseServerClient\(\);\n  const \{\n    data: \{ user \},\n    error,\n  \} = await supabase\.auth\.getUser\(\);\n  if \(error \|\| !user\) \{\n    return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\n  \}\n  const ctx = await resolveWorkspaceContext\(supabase, user\.id\);/g,
];

function ensureImport(src) {
  if (!src.includes("getRequestWorkspace")) return src;
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
  for (const pattern of patterns) {
    src = src.replace(pattern, replaceBlock);
  }
  src = src.replace(
    /const \{ supabase, user, ctx, dataUserId \} = workspace;\n  const dataUserId = ctx\.dataUserId;/g,
    "const { supabase, user, ctx, dataUserId } = workspace;",
  );
  src = ensureImport(src);
  if (src !== orig) {
    fs.writeFileSync(file, src);
    changed += 1;
    console.log("updated", file);
  }
}
console.log("total", changed);

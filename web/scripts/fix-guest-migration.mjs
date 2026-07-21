import fs from "node:fs";
import { execSync } from "node:child_process";

const files = execSync('rg -l "getRequestWorkspace" src/app/api', { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

let changed = 0;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const orig = src;

  // Remove duplicate dataUserId assignment after destructuring includes dataUserId
  src = src.replace(
    /(const \{ supabase, user, ctx, dataUserId \} = workspace;\s*\n)\s*const dataUserId = ctx\.dataUserId;\s*\n/g,
    "$1",
  );

  // Partial migration: optional workspace destructure -> full check
  src = src.replace(
    /const \{ ctx, dataUserId \} = \(await getRequestWorkspace\(\)\) \?\? \{\};\s*\n\s*if \(!ctx\) \{\s*\n\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\s*\n\s*\}/g,
    `const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;`,
  );

  // Partial migration with supabase already defined above
  src = src.replace(
    /const \{ ctx, dataUserId \} = \(await getRequestWorkspace\(\)\) \?\? \{\};\s*\n\s*if \(!ctx \|\| !dataUserId\) \{\s*\n\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\s*\n\s*\}/g,
    `const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { ctx, dataUserId } = workspace;`,
  );

  src = src.replace(
    /const sessionUserId = user\.id;/g,
    "const sessionUserId = user?.id ?? dataUserId;",
  );

  // Old auth block still using resolveWorkspaceContext after partial migration
  src = src.replace(
    /const supabase = await createSupabaseServerClient\(\);\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\{ ok: false, error: "Unauthorized" \}, \{ status: 401 \}\);\s*\n\s*\}\s*\n\s*\n\s*const ctx = await resolveWorkspaceContext\(supabase, user\.id\);\s*\n(?:\s*assertCanRunSharedAi\(ctx\);\s*\n)?\s*const dataUserId = ctx\.dataUserId;/g,
    `const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  assertCanRunSharedAi(ctx);`,
  );

  src = src.replace(
    /const supabase = await createSupabaseServerClient\(\);\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\s*\n\s*\}\s*\n\s*\n\s*const ctx = await resolveWorkspaceContext\(supabase, user\.id\);/g,
    `const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;`,
  );

  if (!src.includes('@/lib/team/session-workspace"') && src.includes("getRequestWorkspace")) {
    const importLine = 'import { getRequestWorkspace } from "@/lib/team/session-workspace";\n';
    const lastImport = src.lastIndexOf('\nimport ');
    if (lastImport >= 0) {
      const end = src.indexOf("\n", lastImport + 1);
      src = src.slice(0, end + 1) + importLine + src.slice(end + 1);
    }
  }

  if (src.includes("getRequestWorkspace") && src.includes("resolveWorkspaceContext(")) {
    src = src.replace(
      /import \{ resolveWorkspaceContext(?:, type WorkspaceContext)? \} from "@\/lib\/team\/workspace-context";\n?/g,
      "",
    );
    src = src.replace(
      /import \{([^}]*), resolveWorkspaceContext([^}]*)\} from "@\/lib\/team\/workspace-context";\n?/g,
      'import {$1$2} from "@/lib/team/workspace-context";\n',
    );
  }

  if (src !== orig) {
    fs.writeFileSync(file, src);
    changed += 1;
    console.log("fixed", file);
  }
}

console.log("total", changed);

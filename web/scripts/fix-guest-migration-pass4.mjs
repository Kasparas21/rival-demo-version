import fs from "node:fs";
import { execSync } from "node:child_process";

const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];

const files = execSync('rg -l "getRequestWorkspace" src/app/api', { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

let changed = 0;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const orig = src;

  for (const method of mutationMethods) {
    src = src.replace(
      new RegExp(
        `(export async function ${method}[^{]*\\{)\\s*\\n\\s*const workspace = await getRequestWorkspace\\(\\);\\s*\\n\\s*if \\(!workspace\\) \\{\\s*\\n\\s*return NextResponse\\.json\\(\\{[^}]+\\}, \\{ status: 401 \\}\\);\\s*\\n\\s*\\}\\s*\\n\\s*const \\{ supabase, user, ctx, dataUserId \\} = workspace;`,
        "g",
      ),
      `$1
  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;`,
    );
  }

  if (src !== orig) {
    fs.writeFileSync(file, src);
    changed += 1;
    console.log("fixed", file);
  }
}

console.log("total", changed);

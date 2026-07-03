function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

/** Lightweight markdown → HTML for agent emails (headings, bullets, paragraphs). */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      closeList();
      out.push(`<h3 style="margin:20px 0 8px;font-size:16px;color:#1a1a2e;">${inlineMarkdown(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      closeList();
      out.push(`<h2 style="margin:24px 0 10px;font-size:18px;color:#1a1a2e;">${inlineMarkdown(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        out.push('<ul style="margin:8px 0 16px;padding-left:20px;color:#374151;">');
        inList = true;
      }
      out.push(`<li style="margin:4px 0;line-height:1.5;">${inlineMarkdown(trimmed.slice(2))}</li>`);
      continue;
    }

    closeList();
    out.push(`<p style="margin:0 0 12px;line-height:1.6;color:#374151;">${inlineMarkdown(trimmed)}</p>`);
  }

  closeList();
  return out.join("\n");
}

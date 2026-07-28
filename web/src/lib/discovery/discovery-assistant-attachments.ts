export type DiscoveryChatAttachment = {
  id: string;
  name: string;
  mimeType: string;
  kind: "image" | "text";
  dataUrl?: string;
  textContent?: string;
};

export type DiscoveryAssistantAttachmentInput = {
  name: string;
  mimeType: string;
  kind: "image" | "text";
  dataUrl?: string;
  textContent?: string;
};

const MAX_ATTACHMENTS = 5;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_BYTES = 120 * 1024;

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/json",
]);

function newAttachmentId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

export function attachmentInputFromChat(attachment: DiscoveryChatAttachment): DiscoveryAssistantAttachmentInput {
  return {
    name: attachment.name,
    mimeType: attachment.mimeType,
    kind: attachment.kind,
    dataUrl: attachment.dataUrl,
    textContent: attachment.textContent,
  };
}

export async function parseChatAttachmentFile(
  file: File,
): Promise<DiscoveryChatAttachment | { error: string }> {
  const mimeType = (file.type || "application/octet-stream").toLowerCase();
  const name = file.name.trim() || "attachment";

  if (IMAGE_TYPES.has(mimeType)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: `${name} is too large (max 2MB for images).` };
    }
    const dataUrl = await readFileAsDataUrl(file);
    return { id: newAttachmentId(), name, mimeType, kind: "image", dataUrl };
  }

  const isText =
    TEXT_TYPES.has(mimeType) ||
    /\.(txt|md|csv|json)$/i.test(name) ||
    mimeType.startsWith("text/");

  if (isText) {
    if (file.size > MAX_TEXT_BYTES) {
      return { error: `${name} is too large (max 120KB for text files).` };
    }
    const textContent = (await readFileAsText(file)).trim();
    if (!textContent) return { error: `${name} is empty.` };
    return { id: newAttachmentId(), name, mimeType, kind: "text", textContent };
  }

  return { error: `${name}: unsupported file type. Use images or text files (.txt, .md, .csv, .json).` };
}

export async function parseChatAttachmentFiles(
  files: FileList | File[],
  existingCount = 0,
): Promise<{ attachments: DiscoveryChatAttachment[]; errors: string[] }> {
  const list = [...files];
  const attachments: DiscoveryChatAttachment[] = [];
  const errors: string[] = [];
  const slots = Math.max(0, MAX_ATTACHMENTS - existingCount);

  for (const file of list.slice(0, slots)) {
    const parsed = await parseChatAttachmentFile(file);
    if ("error" in parsed) errors.push(parsed.error);
    else attachments.push(parsed);
  }

  if (list.length > slots) {
    errors.push(`Only ${MAX_ATTACHMENTS} attachments allowed per message.`);
  }

  return { attachments, errors };
}

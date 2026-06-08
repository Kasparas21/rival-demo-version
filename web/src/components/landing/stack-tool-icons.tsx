import type { LucideIcon } from "lucide-react";
import { FileSpreadsheet, FolderOpen, Layers, Play, Search, UserSearch } from "lucide-react";

import type { StackToolCopy } from "@/lib/i18n/landing/types";

const ICON_BY_KEY: Record<StackToolCopy["iconKey"], LucideIcon> = {
  search: Search,
  userSearch: UserSearch,
  play: Play,
  layers: Layers,
  folder: FolderOpen,
  spreadsheet: FileSpreadsheet,
};

export function stackToolIcon(tool: StackToolCopy) {
  return ICON_BY_KEY[tool.iconKey];
}

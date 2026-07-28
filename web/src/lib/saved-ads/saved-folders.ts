import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export const DEFAULT_SAVED_FOLDER_NAME = "General";

export type SavedFolderRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export async function listSavedFolders(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ folders: SavedFolderRow[]; error?: string }> {
  const { data, error } = await supabase
    .from("saved_folders")
    .select("id, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) return { folders: [], error: error.message };
  return { folders: (data ?? []) as SavedFolderRow[] };
}

export async function createSavedFolder(
  supabase: SupabaseClient<Database>,
  userId: string,
  name: string,
): Promise<{ folder: SavedFolderRow | null; error?: string }> {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { folder: null, error: "invalid name" };

  const { data, error } = await supabase
    .from("saved_folders")
    .insert({ user_id: userId, name: trimmed })
    .select("id, name, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") return { folder: null, error: "folder already exists" };
    return { folder: null, error: error.message };
  }
  return { folder: data as SavedFolderRow };
}

/** Ensure user has at least one folder; returns the default or newly created General folder. */
export async function ensureDefaultSavedFolder(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ folderId: string | null; error?: string }> {
  const { folders, error: listErr } = await listSavedFolders(supabase, userId);
  if (listErr) return { folderId: null, error: listErr };
  if (folders.length > 0) return { folderId: folders[0]!.id };

  const { folder, error } = await createSavedFolder(supabase, userId, DEFAULT_SAVED_FOLDER_NAME);
  if (error || !folder) return { folderId: null, error: error ?? "failed to create folder" };
  return { folderId: folder.id };
}

export async function resolveSavedFolderId(
  supabase: SupabaseClient<Database>,
  userId: string,
  folderId: string | null | undefined,
): Promise<{ folderId: string | null; error?: string }> {
  const trimmed = folderId?.trim();
  if (!trimmed) {
    return ensureDefaultSavedFolder(supabase, userId);
  }

  const { data, error } = await supabase
    .from("saved_folders")
    .select("id")
    .eq("id", trimmed)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { folderId: null, error: error.message };
  if (!data) return { folderId: null, error: "folder not found" };
  return { folderId: data.id };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const PENDING_SAVED_EMAIL_ID = "__pending_saved_email__";

export function isEmailSaved(savedMap: Record<string, string>, emailId: string): boolean {
  const id = savedMap[emailId];
  return Boolean(id);
}

export function buildSavedEmailsCheckQueryKey(competitorId: string, emailIds: readonly string[]): string {
  const sorted = [...emailIds].sort().join(",");
  return `${competitorId}:${sorted}`;
}

export function useSavedEmailsStatus(competitorId: string, emailIds: readonly string[]) {
  const [savedMap, setSavedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const checkQueryKey = useMemo(
    () => buildSavedEmailsCheckQueryKey(competitorId, emailIds),
    [competitorId, emailIds],
  );
  const lastFetchedKey = useRef<string | null>(null);

  useEffect(() => {
    const cid = competitorId.trim();
    const ids = [...new Set(emailIds.map((id) => id.trim()).filter(Boolean))];
    if (!cid || ids.length === 0) {
      setSavedMap({});
      return;
    }
    if (lastFetchedKey.current === checkQueryKey) return;

    let cancelled = false;
    setLoading(true);
    void fetch("/api/saved-emails/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ competitorId: cid, emailIds: ids }),
    })
      .then((r) => r.json())
      .then((res: { ok?: boolean; savedMap?: Record<string, string> }) => {
        if (cancelled || !res.ok) return;
        lastFetchedKey.current = checkQueryKey;
        setSavedMap(res.savedMap ?? {});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competitorId, emailIds, checkQueryKey]);

  const saveEmail = useCallback(
    async (emailId: string) => {
      const cid = competitorId.trim();
      if (!cid || !emailId.trim()) return null;

      setSavedMap((prev) => ({ ...prev, [emailId]: PENDING_SAVED_EMAIL_ID }));

      try {
        const res = await fetch("/api/saved-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ competitorEmailId: emailId }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          savedEmail?: { id: string; source_competitor_email_id: string | null };
        };
        if (json.ok && json.savedEmail) {
          const sourceId = json.savedEmail.source_competitor_email_id ?? emailId;
          setSavedMap((prev) => ({ ...prev, [sourceId]: json.savedEmail!.id }));
          return json.savedEmail.id;
        }
        setSavedMap((prev) => {
          const next = { ...prev };
          delete next[emailId];
          return next;
        });
        return null;
      } catch {
        setSavedMap((prev) => {
          const next = { ...prev };
          delete next[emailId];
          return next;
        });
        return null;
      }
    },
    [competitorId],
  );

  const unsaveEmail = useCallback(async (emailId: string) => {
    const savedId = savedMap[emailId];
    if (!savedId || savedId === PENDING_SAVED_EMAIL_ID) return false;

    const res = await fetch(`/api/saved-emails/${savedId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      setSavedMap((prev) => {
        const next = { ...prev };
        delete next[emailId];
        return next;
      });
      return true;
    }
    return false;
  }, [savedMap]);

  const toggleSave = useCallback(
    async (emailId: string) => {
      if (isEmailSaved(savedMap, emailId)) {
        return unsaveEmail(emailId);
      }
      const id = await saveEmail(emailId);
      return Boolean(id);
    },
    [savedMap, saveEmail, unsaveEmail],
  );

  const refreshSavedMap = useCallback(() => {
    lastFetchedKey.current = null;
  }, []);

  return {
    savedMap,
    loading,
    isSaved: (emailId: string) => isEmailSaved(savedMap, emailId),
    saveEmail,
    unsaveEmail,
    toggleSave,
    refreshSavedMap,
    setSavedRowId: (emailId: string, savedRowId: string | null) => {
      setSavedMap((prev) => {
        const next = { ...prev };
        if (savedRowId) {
          next[emailId] = savedRowId;
        } else {
          delete next[emailId];
        }
        return next;
      });
    },
  };
}

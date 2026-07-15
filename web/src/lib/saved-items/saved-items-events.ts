/** Cross-component signal that saved items (ads/emails/organic/landings) changed. */
export const SAVED_ITEMS_CHANGED_EVENT = "rival:saved-items-changed";

export function emitSavedItemsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SAVED_ITEMS_CHANGED_EVENT));
}

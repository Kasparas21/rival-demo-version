/**
 * Sign out by leaving the page with a form POST to `/auth/sign-out`, which clears the session and redirects.
 * A POST (not a link) so another site can't sign people out; a navigation (not fetch) so the current page
 * never re-renders signed out.
 */
export function submitSignOut(next = "/login"): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/auth/sign-out";
  const field = document.createElement("input");
  field.type = "hidden";
  field.name = "next";
  field.value = next;
  form.appendChild(field);
  document.body.appendChild(form);
  form.submit();
}

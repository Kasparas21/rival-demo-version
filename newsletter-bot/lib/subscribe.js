const { chromium, webkit } = require("playwright");

const NEWSLETTER_KEYWORDS = /newsletter|subscribe|signup|sign-up|sign up|mailing|updates|notify/i;
const SUBMIT_KEYWORDS = /subscribe|sign up|sign-up|join|get updates|notify me|submit|send/i;
const CHECKBOX_KEYWORDS =
  /newsletter|email list|sign up|signup|subscribe|updates|promotions|mailing|opt.?in/i;
const SUCCESS_KEYWORDS = /thank|success|subscribed|confirm|you.?re in|welcome|check your (inbox|email)/i;
const CAPTCHA_SELECTORS = [
  'iframe[src*="recaptcha"]',
  'iframe[src*="hcaptcha"]',
  ".g-recaptcha",
  "[data-sitekey]",
  "#captcha",
  '[class*="captcha"]',
];

/**
 * @param {string} message
 * @param {(msg: string) => void} onStatus
 */
function status(onStatus, message) {
  onStatus(message);
}

/**
 * @param {import('playwright').Locator} input
 * @returns {Promise<string>}
 */
async function getInputLabelText(input) {
  return input.evaluate((el) => {
    const id = el.id;
    if (id) {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (label) return label.textContent || "";
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return parentLabel.textContent || "";
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === "LABEL") return prev.textContent || "";
    return "";
  });
}

/**
 * @param {import('playwright').ElementHandle} input
 * @returns {Promise<number>}
 */
async function scoreEmailInput(input) {
  let score = 0;
  const type = (await input.getAttribute("type")) || "";
  const name = (await input.getAttribute("name")) || "";
  const id = (await input.getAttribute("id")) || "";
  const placeholder = (await input.getAttribute("placeholder")) || "";
  const ariaLabel = (await input.getAttribute("aria-label")) || "";
  const combined = `${name} ${id} ${placeholder} ${ariaLabel}`.toLowerCase();

  if (type.toLowerCase() === "email") score += 10;
  if (/email/.test(combined)) score += 10;
  if (/newsletter|subscribe|signup|sign-up|mailing/.test(combined)) score += 5;

  const labelText = await input.evaluate((el) => {
    const elemId = el.id;
    if (elemId) {
      const label = document.querySelector(`label[for="${CSS.escape(elemId)}"]`);
      if (label) return (label.textContent || "").toLowerCase();
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return (parentLabel.textContent || "").toLowerCase();
    return "";
  });
  if (/email/.test(labelText)) score += 10;

  const form = await input.evaluateHandle((el) => el.closest("form"));
  const formEl = form.asElement();
  if (formEl) {
    const formInfo = await formEl.evaluate((f) => ({
      text: f.textContent || "",
      action: f.getAttribute("action") || "",
    }));
    if (NEWSLETTER_KEYWORDS.test(formInfo.text) || NEWSLETTER_KEYWORDS.test(formInfo.action)) {
      score += 5;
    }
  }

  return score;
}

/**
 * @param {import('playwright').Page} page
 * @param {import('playwright').Locator} scope
 * @returns {Promise<import('playwright').Locator | null>}
 */
async function findBestEmailInput(page, scope) {
  const selectors = [
    'input[type="email"]',
    'input[name*="email" i]',
    'input[id*="email" i]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
    'input[aria-label*="email" i]',
    'input[name*="newsletter" i]',
    'input[id*="newsletter" i]',
    'input[name*="subscribe" i]',
    'input[type="text"][name*="mail" i]',
    "input",
  ];

  /** @type {{ locator: import('playwright').Locator, score: number } | null} */
  let best = null;

  for (const selector of selectors) {
    const inputs = scope.locator(selector);
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const locator = inputs.nth(i);
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;

      const inputType = ((await locator.getAttribute("type")) || "text").toLowerCase();
      if (["checkbox", "radio", "hidden", "submit", "button"].includes(inputType)) continue;

      const placeholder = (await locator.getAttribute("placeholder")) || "";
      const labelText = await getInputLabelText(locator);
      const hasEmailHint = /email/i.test(placeholder) || /email/i.test(labelText);

      if (selector === "input" && !hasEmailHint) {
        const name = (await locator.getAttribute("name")) || "";
        const id = (await locator.getAttribute("id")) || "";
        if (!/email/i.test(`${name} ${id}`)) continue;
      }

      const handle = await locator.elementHandle();
      if (!handle) continue;

      const score = await scoreEmailInput(handle);
      if (!best || score > best.score) {
        best = { locator, score };
      }
    }
  }

  return best?.locator ?? null;
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
async function dismissBlockingOverlays(page) {
  const dismissSelectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept all")',
    'button:has-text("Agree")',
    'button:has-text("Got it")',
    'button:has-text("Close")',
    '[aria-label="Close"]',
    '[aria-label="Dismiss"]',
    'button[class*="close" i]',
  ];

  for (const selector of dismissSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
async function dismissOverlays(page) {
  const overlaySelectors = [
    "#onetrust-accept-btn-handler",
    ".onetrust-accept-btn-handler",
    "button#onetrust-accept-btn-handler",
    '[id="cookie"] button[id*="accept"]',
    '[id*="consent"] button[id*="accept"]',
    'button:has-text("Accept")',
    'button:has-text("OK")',
    'button:has-text("Accept All")',
    'button:has-text("I Accept")',
    'button:has-text("Agree")',
  ];

  for (const selector of overlaySelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1000 })) {
        await btn.click();
        await page.waitForTimeout(1000);
        break;
      }
    } catch {
      // ignore missing or unclickable overlay buttons
    }
  }

  const closeSelectors = [
    'button:has-text("Stay on United States")',
    'button:has-text("Switch to")',
    '[aria-label="Close"]',
    "button.close",
  ];

  for (const selector of closeSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1000 })) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // ignore missing or unclickable close buttons
    }
  }
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function hasCaptcha(page) {
  for (const selector of CAPTCHA_SELECTORS) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {import('playwright').Locator} emailInput
 * @returns {Promise<import('playwright').Locator | null>}
 */
async function findSubmitButton(emailInput) {
  const container = getFormContainer(emailInput);

  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    "button",
    'a[role="button"]',
  ];

  for (const selector of submitSelectors) {
    const buttons = container.locator(selector);
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const visible = await btn.isVisible().catch(() => false);
      if (!visible) continue;

      const text = ((await btn.textContent()) || "").trim();
      const value = (await btn.getAttribute("value")) || "";
      const type = (await btn.getAttribute("type")) || "";

      if (type === "submit" || SUBMIT_KEYWORDS.test(text) || SUBMIT_KEYWORDS.test(value)) {
        return btn;
      }
    }
  }

  return null;
}

/**
 * @param {import('playwright').Locator} emailInput
 * @returns {import('playwright').Locator}
 */
function getFormContainer(emailInput) {
  return emailInput.locator(
    "xpath=ancestor::form[1] | ancestor::*[contains(@class,'newsletter') or contains(@class,'subscribe') or contains(@class,'signup') or contains(@class,'contact')][1]"
  );
}

/**
 * @param {import('playwright').Locator} emailInput
 * @param {(msg: string) => void} onStatus
 * @returns {Promise<boolean>}
 */
async function checkNewsletterOptIn(emailInput, onStatus) {
  const container = getFormContainer(emailInput);
  const checkboxes = container.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  let checkedAny = false;

  for (let i = 0; i < count; i++) {
    const checkbox = checkboxes.nth(i);
    const visible = await checkbox.isVisible().catch(() => false);
    if (!visible) continue;

    const labelText = await checkbox.evaluate((el) => {
      const id = el.id;
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label) return label.textContent || "";
      }
      const parentLabel = el.closest("label");
      if (parentLabel) return parentLabel.textContent || "";
      const parent = el.parentElement;
      return parent ? parent.textContent || "" : "";
    });

    if (!CHECKBOX_KEYWORDS.test(labelText)) continue;

    const isChecked = await checkbox.isChecked().catch(() => false);
    if (!isChecked) {
      status(onStatus, "Checking newsletter opt-in checkbox...");
      await checkbox.check({ force: true }).catch(async () => {
        await checkbox.click();
      });
      checkedAny = true;
    }
  }

  return checkedAny;
}

/**
 * @param {import('playwright').Locator} emailInput
 * @param {(msg: string) => void} onStatus
 * @returns {Promise<void>}
 */
async function fillNameFieldIfPresent(emailInput, onStatus) {
  const container = getFormContainer(emailInput);
  const inputs = container.locator("input");
  const count = await inputs.count();

  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const visible = await input.isVisible().catch(() => false);
    if (!visible) continue;

    const type = ((await input.getAttribute("type")) || "text").toLowerCase();
    if (["email", "checkbox", "radio", "hidden", "submit", "button"].includes(type)) continue;

    const placeholder = (await input.getAttribute("placeholder")) || "";
    const labelText = await getInputLabelText(input);
    const nameAttr = (await input.getAttribute("name")) || "";
    const id = (await input.getAttribute("id")) || "";
    const hints = `${placeholder} ${labelText} ${nameAttr} ${id}`;

    if (/first/i.test(hints) && !/email/i.test(hints)) {
      status(onStatus, "Filling first name field...");
      await input.fill("Newsletter");
      return;
    }

    if (/name/i.test(hints) && !/last|surname|email/i.test(hints)) {
      status(onStatus, "Filling name field...");
      await input.fill("Newsletter Subscriber");
      return;
    }
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {(msg: string) => void} onStatus
 * @returns {Promise<void>}
 */
async function fillLastNameFieldIfPresent(page, onStatus) {
  const lastNameInput = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input"));
    const last = inputs.find(
      (el) =>
        el.offsetParent !== null &&
        ((el.placeholder && el.placeholder.toLowerCase().includes("last")) ||
          (el.name && el.name.toLowerCase().includes("last")) ||
          (el.id && el.id.toLowerCase().includes("last")) ||
          (el.placeholder && el.placeholder.toLowerCase().includes("surname")))
    );
    return last
      ? { id: last.id, name: last.name, placeholder: last.placeholder }
      : null;
  });

  if (!lastNameInput) return;

  const selector = lastNameInput.id
    ? `input[id="${lastNameInput.id}"]`
    : `input[name="${lastNameInput.name}"]`;

  status(onStatus, "Filling last name field...");
  await page.fill(selector, "Subscriber");
}

/**
 * @param {import('playwright').Locator} emailInput
 * @param {(msg: string) => void} onStatus
 * @returns {Promise<void>}
 */
async function fillMessageFieldIfPresent(emailInput, onStatus) {
  const container = getFormContainer(emailInput);
  const textareas = container.locator("textarea");
  const count = await textareas.count();

  for (let i = 0; i < count; i++) {
    const textarea = textareas.nth(i);
    const visible = await textarea.isVisible().catch(() => false);
    if (!visible) continue;

    const placeholder = (await textarea.getAttribute("placeholder")) || "";
    const labelText = await getInputLabelText(textarea);
    const nameAttr = (await textarea.getAttribute("name")) || "";
    const id = (await textarea.getAttribute("id")) || "";
    const hints = `${placeholder} ${labelText} ${nameAttr} ${id}`;

    if (/message|comment|note/i.test(hints)) {
      const current = await textarea.inputValue().catch(() => "");
      if (!current.trim()) {
        status(onStatus, "Filling message field...");
        await textarea.fill("Newsletter subscription");
      }
      return;
    }
  }
}

/**
 * @param {(msg: string) => void} onStatus
 * @returns {Promise<import('playwright').Browser>}
 */
async function launchBrowser(onStatus) {
  const chromiumOptions = {
    channel: "chrome",
    headless: false,
  };

  try {
    status(onStatus, "Launching Chromium browser...");
    return await chromium.launch(chromiumOptions);
  } catch {
    status(onStatus, "Chromium failed — falling back to WebKit...");
    return webkit.launch({ headless: false });
  }
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
function isBrowserCrash(err) {
  const message = err instanceof Error ? err.message : String(err);
  return /SEGV|signal 11|SIGSEGV|browser has been closed|Target crashed/i.test(message);
}

/**
 * @param {import('playwright').Page} page
 * @param {import('playwright').Locator} emailInput
 * @param {string} email
 * @param {(msg: string) => void} onStatus
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function fillAndSubmit(page, emailInput, email, onStatus) {
  status(onStatus, "Found signup form — filling fields...");
  await emailInput.scrollIntoViewIfNeeded();

  await fillNameFieldIfPresent(emailInput, onStatus);
  await fillLastNameFieldIfPresent(page, onStatus);

  await emailInput.click();
  await emailInput.fill(email);

  await fillMessageFieldIfPresent(emailInput, onStatus);

  await checkNewsletterOptIn(emailInput, onStatus);

  status(onStatus, "Clicking send...");
  const submitted = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find((el) => {
      const text = `${el.textContent || ""} ${el.value || ""}`.trim().toLowerCase();
      return (
        text.includes("send") ||
        text.includes("submit") ||
        text.includes("subscribe") ||
        text.includes("sign up")
      );
    });
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  const urlBefore = page.url();

  if (!submitted) {
    await emailInput.press("Enter");
  }

  await page.waitForTimeout(3000);

  const urlAfter = page.url();
  if (urlAfter !== urlBefore && SUCCESS_KEYWORDS.test(urlAfter)) {
    return { success: true, message: "Subscribed successfully — redirected to confirmation page." };
  }

  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (SUCCESS_KEYWORDS.test(bodyText)) {
    return { success: true, message: "Subscribed successfully — confirmation message detected on page." };
  }

  const formStillVisible = await emailInput.isVisible().catch(() => false);
  if (!formStillVisible) {
    return { success: true, message: "Subscribed successfully — signup form disappeared after submit." };
  }

  const errorEl = page.locator('[class*="error" i], [role="alert"], .invalid-feedback').first();
  if (await errorEl.isVisible({ timeout: 1000 }).catch(() => false)) {
    const errorText = ((await errorEl.textContent()) || "Unknown error").trim();
    return { success: false, message: `Submit failed: ${errorText}` };
  }

  return {
    success: true,
    message: "Form submitted — no error detected (confirmation email may be required).",
  };
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<{ id: string, name: string, placeholder: string, type: string } | null>}
 */
async function findEmailFieldMeta(page) {
  return page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input"));
    const email = inputs.find(
      (el) =>
        el.offsetParent !== null &&
        (el.type === "email" ||
          (el.placeholder && el.placeholder.toLowerCase().includes("email")) ||
          (el.name && el.name.toLowerCase().includes("email")) ||
          (el.id && el.id.toLowerCase().includes("email")))
    );
    return email
      ? {
          id: email.id,
          name: email.name,
          placeholder: email.placeholder,
          type: email.type,
        }
      : null;
  });
}

/**
 * @param {import('playwright').Page} page
 * @param {{ id: string, name: string, placeholder: string, type: string }} emailFieldMeta
 * @returns {import('playwright').Locator}
 */
function locatorFromEmailMeta(page, emailFieldMeta) {
  if (emailFieldMeta.id) {
    return page.locator(`input[id="${emailFieldMeta.id}"]`);
  }
  if (emailFieldMeta.name) {
    return page.locator(`input[name="${emailFieldMeta.name}"]`);
  }
  return page.locator('input[type="email"]').first();
}

/**
 * @param {string} url
 * @param {string} email
 * @param {(msg: string) => void} onStatus
 * @param {import('playwright').Browser} browser
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function runSubscribe(url, email, onStatus, browser) {
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);

  await dismissBlockingOverlays(page);

  if (await hasCaptcha(page)) {
    return { success: false, message: "Captcha detected, cannot proceed automatically." };
  }

  // DEBUG: log everything on the page
  const allInputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("input, textarea, button")).map((el) => ({
      tag: el.tagName,
      type: el.type,
      placeholder: el.placeholder,
      name: el.name,
      id: el.id,
      visible: el.offsetParent !== null,
    }));
  });
  console.log("ALL INPUTS FOUND:", JSON.stringify(allInputs, null, 2));

  status(onStatus, "Scrolling to bottom of page...");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  status(onStatus, "Dismissing cookie banners and overlays...");
  await dismissOverlays(page);
  await page.waitForTimeout(2000);

  status(onStatus, "Scanning page for email field...");
  const emailFieldMeta = await findEmailFieldMeta(page);
  if (emailFieldMeta) {
    status(
      onStatus,
      `Found email field: id=${emailFieldMeta.id || "(none)"} name=${emailFieldMeta.name || "(none)"} placeholder=${emailFieldMeta.placeholder || "(none)"}`
    );
    const emailInput = locatorFromEmailMeta(page, emailFieldMeta);
    return fillAndSubmit(page, emailInput, email, onStatus);
  }

  return { success: false, message: "Could not find a newsletter signup form on this page." };
}

/**
 * @param {string} url
 * @param {string} email
 * @param {(msg: string) => void} onStatus
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function subscribe(url, email, onStatus) {
  /** @type {import('playwright').Browser | null} */
  let browser = null;

  try {
    status(onStatus, "Opening website...");
    browser = await launchBrowser(onStatus);

    try {
      return await runSubscribe(url, email, onStatus, browser);
    } catch (err) {
      if (!isBrowserCrash(err)) throw err;

      await browser.close().catch(() => {});
      browser = null;

      status(onStatus, "Chromium crashed — retrying with WebKit...");
      browser = await webkit.launch({ headless: false });
      return await runSubscribe(url, email, onStatus, browser);
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

module.exports = { subscribe };

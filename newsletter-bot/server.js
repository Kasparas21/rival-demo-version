const express = require("express");
const path = require("path");
const { subscribe } = require("./lib/subscribe");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * @param {import('express').Response} res
 * @param {object} data
 */
function sendSse(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

app.post("/api/subscribe", async (req, res) => {
  const { url, email } = req.body || {};

  if (!url || !email) {
    res.status(400).json({ error: "Both url and email are required." });
    return;
  }

  if (!isValidUrl(url)) {
    res.status(400).json({ error: "URL must start with http:// or https://" });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  /** @param {string} message */
  const onStatus = (message) => {
    sendSse(res, { step: "status", message });
  };

  try {
    const result = await subscribe(url, email, onStatus);
    sendSse(res, {
      step: "done",
      success: result.success,
      message: result.success ? result.message || "Done!" : result.message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    sendSse(res, { step: "error", success: false, message });
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Newsletter bot running at http://localhost:${PORT}`);
});

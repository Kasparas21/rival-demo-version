# Newsletter Bot

A standalone test tool that visits a website, finds the newsletter signup form, enters an email address, and clicks subscribe — using Playwright browser automation.

## Quick start

```bash
cd newsletter-bot
npm install
npm start
```

Then open **http://localhost:3001** in your browser.

## Usage

1. Enter the **website URL** (must start with `http://` or `https://`)
2. Enter the **email address** to subscribe with
3. Click **Subscribe**
4. Watch the status log for real-time progress

The bot searches for signup forms in this order: footer → popups/modals → whole page.

## Requirements

- Node.js 18 or later
- First `npm install` downloads Chromium (~150 MB) automatically

## Limitations

- Sites with CAPTCHA cannot be completed automatically
- Multi-step signup flows may not work
- Some sites require email confirmation — the bot only submits the form
- This is a local test tool and is not deployed with the main SpyRival app

## Port

Runs on **port 3001** by default so it does not clash with the main app on port 3000. Override with the `PORT` environment variable if needed.

// Runtime config. Edit this file AFTER importing N8N workflows and reading
// the webhook base URL shown on the webhook trigger nodes.

window.CONFIG = {
  // Example: "https://n8n.spinny.internal/webhook"
  // Leave empty string to run in "offline" mode (uses seed data from window.__SEED__).
  N8N_BASE: "https://n8n-xtdwg-u30560.vm.elestio.app/webhook",

  // How often to re-fetch the issue-detail screen while it's open.
  // 30s keeps us safely under Google Sheets API rate limits.
  POLL_INTERVAL_MS: 30000,

  // Which user ID to attribute AI-generated comments to.
  AI_BOT_USER_ID: "u_bot",

  // Raise-issue form: lets technicians upload images/audio/pdf via Drive.
  ATTACHMENT_MAX_BYTES: 25 * 1024 * 1024,
  ATTACHMENT_ACCEPT:    "image/*,audio/*,application/pdf",

  // Brand
  APP_NAME:       "Refurb Helpdesk",
  APP_SHORT_NAME: "Helpdesk",
};

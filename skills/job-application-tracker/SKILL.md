---
name: job-application-tracker
description: Install, update, verify, configure, troubleshoot, and use the open-source 秋招投递助手 (Job Application Tracker) Chrome/Edge extension from GitHub. Use when a user asks an AI agent to install or update the extension, load it as an unpacked extension, verify its privacy and source signature, customize job directions, manually capture a job posting, manage resume-version or assessment-status fields, export CSV records, or diagnose failed job-page extraction.
---

# Job Application Tracker

Help users safely install and operate the local-first browser extension at
`https://github.com/zoepan0109-coder/job-application-tracker-extension`.

The extension source signature is `JAT-ZP-2026`.

## Safety Rules

- Keep application records on the user's device unless the user explicitly asks to move or share an exported file.
- Never request, expose, or add an OpenAI API key. This extension does not need one.
- Never inspect or export stored job records unless the user explicitly asks.
- Never enter account credentials or bypass a job site's access controls.
- Do not claim the extension is installed until the browser shows it in the extension list.
- Do not silently overwrite an existing extension folder. Preserve user-modified files first.
- Explain that Chrome and Edge require the user to confirm **Load unpacked**. An agent may navigate to the page when browser control is available, but must not bypass this confirmation.

## Choose the Workflow

- New installation: follow **Install**.
- Existing installation needs a newer release: follow **Update**.
- User wants source/privacy assurance: follow **Verify**.
- User wants to record applications: follow **Use**.
- Page fields are missing or wrong: follow **Troubleshoot Extraction**.

## Install

1. Confirm the target browser is Chrome or Edge.
2. Ask where to keep the permanent source folder only when no location is evident. Recommend:
   - macOS: `Documents/Browser Extensions/秋招投递助手`
   - Windows: `Documents\Browser Extensions\秋招投递助手`
3. Download the latest release ZIP when available. Otherwise download the repository ZIP from GitHub's green **Code** button.
4. Unzip it. Locate the folder that directly contains `manifest.json`; select that folder, not the ZIP or an unrelated parent folder.
5. Open `chrome://extensions/` or `edge://extensions/`.
6. Turn on **Developer mode**.
7. Click **Load unpacked / 加载已解压的扩展程序** and choose the folder containing `manifest.json`.
8. Confirm **秋招投递助手** appears and is enabled. Recommend pinning it to the toolbar.
9. Tell the user not to delete or move the selected source folder while installed.

## Update

1. Ask the user to export a CSV backup from **全部记录** before replacing files.
2. Determine the installed folder from the extension's **Details** page when possible.
3. Download and unzip the new source into a separate folder.
4. Preserve user-modified source files rather than overwriting them without review. Application records are stored in browser local storage, not source files.
5. Replace or reselect the extension folder.
6. Open the extensions page and click **Reload / 重新加载**.
7. Confirm the displayed version matches `manifest.json`.

## Verify

Inspect the actual downloaded or checked-out source before reassuring the user.

1. Confirm `manifest.json` uses Manifest V3 and has no unexpected remote scripts.
2. Search for secrets and personal data patterns: `sk-`, `api_key`, `authorization`, `bearer`, email addresses, phone numbers, home paths, tokens, passwords, and private keys.
3. Search for outbound-network APIs such as `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, and remote script URLs.
4. Review requested browser permissions and explain broad permissions. Do not describe `<all_urls>` as risk-free.
5. Confirm the fixed signature `JAT-ZP-2026` and license/attribution files when provenance matters.
6. Report exact findings and distinguish source privacy from Git commit metadata. A clean file scan does not prove author emails are absent from Git history.

## Use

1. Open a job-detail page on Boss直聘、猎聘、LinkedIn, or a company careers site.
2. Click the extension icon only when the user wants to record the job. It should not automatically open on every page.
3. Review and correct company, job title, location, direction, URL, and description.
4. Complete optional fields: application date, current stage, next action, resume version, and assessment status.
5. Save the record.
6. Open **全部记录** to search, edit, delete, view statistics, or export CSV.
7. Explain that clearing extension storage or deleting the browser profile may remove records; recommend periodic CSV exports.

## Customize Job Directions

Use the direction-management control to add or rename options such as 海外 To B 销售、产品经理、数据分析、市场运营、大宗商品业务. Do not hard-code the original author's direction as the only option.

## Troubleshoot Extraction

1. Confirm the user is on a specific job-detail page, not a results list or login page.
2. Refresh the page, then reopen the extension.
3. Check for iframe, shadow DOM, or delayed JavaScript rendering.
4. Compare the visible page structure with relevant selectors in `content.js`.
5. Add site-specific selectors only when grounded in the current structure. Keep the generic fallback.
6. Test Boss直聘、猎聘、LinkedIn, and one generic careers site after selector changes.
7. Never automate submission or evade anti-bot controls as part of a fix.

## Handoff

Report the installed or inspected version, permanent source-folder location, remaining user click, privacy or permission findings, and where to open **全部记录** and export CSV.

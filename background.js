const MENU_ID = "save-job-application";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "记录到秋招投递助手",
    contexts: ["page", "link"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_JOB_TRACKER" });
  } catch {
    // Chrome internal pages do not allow content scripts.
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_RECORDS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }
});

const statuses = ["已投递","笔试/测评","HR面","业务面","终面","Offer沟通","已录用","已拒绝","主动放弃","暂缓"];
const assessmentStatuses = ["待确认","无","待完成","已完成"];
const projectSignature = "JAT-ZP-2026";
const defaultDirections = [
  "海外To B销售","国际业务开发","客户开发","产品经理","数据分析","运营",
  "市场营销","大宗商品业务","贸易运营","产业研究","其他"
];
let applications = [];
let directionOptions = [];
const esc = (value) => String(value || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const storage = globalThis.chrome?.storage?.local ? {
  get: (defaults) => chrome.storage.local.get(defaults),
  set: (value) => chrome.storage.local.set(value)
} : {
  get: async (defaults) => ({
    ...defaults,
    applications: JSON.parse(localStorage.getItem("applications") || "[]"),
    directionOptions: JSON.parse(localStorage.getItem("directionOptions") || "null") || defaults.directionOptions
  }),
  set: async (value) => {
    if (value.applications) localStorage.setItem("applications", JSON.stringify(value.applications));
    if (value.directionOptions) localStorage.setItem("directionOptions", JSON.stringify(value.directionOptions));
  }
};

document.getElementById("filter").innerHTML += statuses.map((v) => `<option>${v}</option>`).join("");

async function load() {
  ({ applications = [], directionOptions = defaultDirections } = await storage.get({
    applications: [],
    directionOptions: defaultDirections
  }));
  if (!directionOptions.length) directionOptions = [...defaultDirections];
  render();
}
function renderStats() {
  const interviewing = applications.filter((x) => ["HR面","业务面","终面"].includes(x.status)).length;
  const active = applications.filter((x) => !["已录用","已拒绝","主动放弃","暂缓"].includes(x.status)).length;
  const overdue = applications.filter((x) => x.nextDate && x.nextDate < new Date().toISOString().slice(0,10) && !["已录用","已拒绝","主动放弃","暂缓"].includes(x.status)).length;
  document.getElementById("stats").innerHTML = [
    ["总投递", applications.length], ["进行中", active], ["面试阶段", interviewing],
    ["Offer/录用", applications.filter((x) => ["Offer沟通","已录用"].includes(x.status)).length],
    ["待完成笔试", applications.filter((x) => x.assessmentStatus === "待完成").length],
    ["逾期待办", overdue]
  ].map(([label, value]) => `<div class="card"><span>${label}</span><strong>${value}</strong></div>`).join("");
}
function render() {
  renderStats();
  const query = document.getElementById("search").value.trim().toLowerCase();
  const status = document.getElementById("filter").value;
  const filtered = applications.filter((x) =>
    (!query || `${x.company} ${x.jobTitle}`.toLowerCase().includes(query)) && (!status || x.status === status)
  );
  document.getElementById("rows").innerHTML = filtered.length ? filtered.map((x) => `<tr data-id="${x.id}">
    <td><a href="${esc(x.url)}" target="_blank" rel="noreferrer">${esc(x.company)}</a></td>
    <td>${esc(x.jobTitle)}</td><td>${esc(x.direction)}</td><td>${esc(x.location)}</td><td>${esc(x.appliedDate)}</td>
    <td><input data-field="resumeVersion" value="${esc(x.resumeVersion)}" placeholder="随手记录版本"></td>
    <td><select data-field="assessmentStatus">${assessmentStatuses.map((v) => `<option ${v === (x.assessmentStatus || "待确认") ? "selected" : ""}>${v}</option>`).join("")}</select></td>
    <td><select data-field="status">${statuses.map((v) => `<option ${v === x.status ? "selected" : ""}>${v}</option>`).join("")}</select></td>
    <td><input data-field="nextAction" value="${esc(x.nextAction)}"></td>
    <td><input type="date" data-field="nextDate" value="${esc(x.nextDate)}"></td>
    <td>${esc(x.source)}</td><td title="${esc(x.notes)}">${x.notes ? "已采集" : "—"}</td><td><button class="delete">删除</button></td>
  </tr>`).join("") : `<tr><td colspan="13" class="empty">还没有投递记录</td></tr>`;
}
async function save() { await storage.set({ applications }); }
async function saveAll() { await storage.set({ applications, directionOptions }); }
document.getElementById("rows").addEventListener("change", async (event) => {
  const row = event.target.closest("tr[data-id]");
  if (!row || !event.target.dataset.field) return;
  const item = applications.find((x) => x.id === row.dataset.id);
  item[event.target.dataset.field] = event.target.value;
  await save(); renderStats();
});
document.getElementById("rows").addEventListener("click", async (event) => {
  if (!event.target.classList.contains("delete")) return;
  const id = event.target.closest("tr").dataset.id;
  applications = applications.filter((x) => x.id !== id);
  await save(); render();
});
document.getElementById("search").addEventListener("input", render);
document.getElementById("filter").addEventListener("change", render);
document.getElementById("clear").addEventListener("click", async () => {
  if (!confirm("确定清空所有投递记录吗？此操作无法撤销。")) return;
  applications = []; await save(); render();
});
const directionDialog = document.getElementById("directionDialog");
document.getElementById("directionSettings").addEventListener("click", () => {
  document.getElementById("directionEditor").value = directionOptions.join("\n");
  directionDialog.showModal();
});
document.getElementById("restoreDirections").addEventListener("click", (event) => {
  event.preventDefault();
  document.getElementById("directionEditor").value = defaultDirections.join("\n");
});
document.getElementById("saveDirections").addEventListener("click", async (event) => {
  event.preventDefault();
  const values = document.getElementById("directionEditor").value
    .split(/\n|,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
  directionOptions = [...new Set(values)];
  if (!directionOptions.length) directionOptions = [...defaultDirections];
  await saveAll();
  directionDialog.close();
});
document.getElementById("export").addEventListener("click", () => {
  const headers = ["序号","公司名称","岗位名称","岗位方向","工作地点","优先级","投递渠道","投递日期","投递简历版本","笔试/测评状态","当前流程","最近进展日期","下一步安排","下一步日期","提醒状态","等待天数","联系人/联系方式","岗位链接","备注","生成工具"];
  const today = new Date().toISOString().slice(0,10);
  const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = applications.map((x, i) => {
    const closed = ["已录用","已拒绝","主动放弃"].includes(x.status);
    const reminder = closed ? "已结束" : !x.nextDate ? "待安排" : x.nextDate < today ? "已逾期" : x.nextDate === today ? "今日" : "待办";
    const last = x.lastProgressDate || x.appliedDate;
    const wait = last ? Math.max(0, Math.floor((new Date(today) - new Date(last)) / 86400000)) : "";
    return [i+1,x.company,x.jobTitle,x.direction,x.location,x.priority,x.source,x.appliedDate,x.resumeVersion,x.assessmentStatus || "待确认",x.status,last,x.nextAction,x.nextDate,reminder,wait,x.contact,x.url,x.notes,x.projectSignature || projectSignature].map(quote).join(",");
  });
  const csv = "\ufeff" + [headers.map(quote).join(","), ...rows].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  if (globalThis.chrome?.downloads) {
    chrome.downloads.download({ url, filename: `秋招投递记录_${today}.csv`, saveAs: true }, () => setTimeout(() => URL.revokeObjectURL(url), 5000));
  } else {
    const link = document.createElement("a");
    link.href = url; link.download = `秋招投递记录_${today}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
});
load();

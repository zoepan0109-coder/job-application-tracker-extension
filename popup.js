const statuses = ["已投递","笔试/测评","HR面","业务面","终面","Offer沟通","已录用","已拒绝","主动放弃","暂缓"];
const defaultDirections = [
  "海外To B销售","国际业务开发","客户开发","产品经理","数据分析","运营",
  "市场营销","大宗商品业务","贸易运营","产业研究","其他"
];
const fields = ["company","jobTitle","location","status","direction","priority","appliedDate","nextDate","nextAction","notes"];
let pageInfo = {};

const fillOptions = (id, items) => {
  document.getElementById(id).innerHTML = items.map((item) => `<option>${item}</option>`).join("");
};
fillOptions("status", statuses);

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
document.getElementById("appliedDate").value = new Date().toISOString().slice(0, 10);
document.getElementById("nextDate").value = addDays(3);

async function load() {
  const stored = await chrome.storage.local.get({
    applications: [],
    directionOptions: defaultDirections
  });
  document.getElementById("count").textContent = `${stored.applications.length} 条`;
  const directions = stored.directionOptions?.length ? stored.directionOptions : defaultDirections;
  const directionList = document.getElementById("directionOptions");
  directionList.replaceChildren(...directions.map((item) => {
    const option = document.createElement("option");
    option.value = item;
    return option;
  }));
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById("source").textContent = tab?.title || "当前页面";
  try {
    pageInfo = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_INFO" });
    for (const field of fields) {
      if (pageInfo?.[field] && document.getElementById(field)) document.getElementById(field).value = pageInfo[field];
    }
  } catch {
    pageInfo = { url: tab?.url || "", source: "手动记录" };
  }
}

document.getElementById("save").addEventListener("click", async () => {
  const record = { ...pageInfo, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  fields.forEach((field) => { record[field] = document.getElementById(field).value.trim(); });
  if (!record.company || !record.jobTitle) {
    document.getElementById("message").textContent = "请填写公司名称和岗位名称";
    return;
  }
  const stored = await chrome.storage.local.get({ applications: [] });
  const duplicate = stored.applications.find((item) =>
    item.url === record.url && item.jobTitle === record.jobTitle && item.appliedDate === record.appliedDate
  );
  if (!duplicate) {
    stored.applications.unshift(record);
    await chrome.storage.local.set({ applications: stored.applications });
  }
  document.getElementById("message").textContent = duplicate ? "该投递已记录" : "保存成功";
  document.getElementById("count").textContent = `${stored.applications.length} 条`;
});
document.getElementById("records").addEventListener("click", () => chrome.runtime.openOptionsPage());
load();

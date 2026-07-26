(() => {
  if (window.__jobApplicationTrackerLoaded) return;
  window.__jobApplicationTrackerLoaded = true;

  const SUCCESS_WORDS = [
    "投递成功", "申请成功", "简历已投递", "已成功投递", "申请已提交",
    "application submitted", "application sent", "successfully applied",
    "your application was sent", "thank you for applying"
  ];
  const JOB_WORDS = ["职位", "岗位", "招聘", "job", "career", "position", "vacancy"];
  const CLOSED_STATUSES = ["已录用", "已拒绝", "主动放弃", "暂缓"];
  let lastPromptKey = "";
  let lastPromptAt = 0;

  const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
  const firstText = (selectors) => {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const value = clean(node?.textContent || node?.getAttribute?.("content"));
      if (value) return value;
    }
    return "";
  };
  const meta = (name) => clean(
    document.querySelector(`meta[property="${name}"]`)?.content ||
    document.querySelector(`meta[name="${name}"]`)?.content
  );
  const titleParts = () => document.title.split(/[-_|｜—]/).map(clean).filter(Boolean);
  const stripHtml = (value) => {
    if (!value) return "";
    const holder = document.createElement("div");
    holder.innerHTML = value;
    return clean(holder.textContent);
  };

  function jobPostingData() {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    const candidates = [];
    const visit = (value) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) return value.forEach(visit);
      const type = value["@type"];
      if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) candidates.push(value);
      if (value["@graph"]) visit(value["@graph"]);
    };
    for (const script of scripts) {
      try { visit(JSON.parse(script.textContent)); } catch { /* Ignore invalid site JSON. */ }
    }
    return candidates[0] || {};
  }

  function structuredLocation(job) {
    const locations = Array.isArray(job.jobLocation) ? job.jobLocation : [job.jobLocation];
    return clean(locations.map((item) => {
      const address = item?.address || {};
      return [address.addressLocality, address.addressRegion, address.addressCountry]
        .filter(Boolean).join(" ");
    }).filter(Boolean).join(" / "));
  }

  function textAroundHeading(labels) {
    const headings = [...document.querySelectorAll("h2,h3,h4,strong,b,[class*='title']")];
    for (const heading of headings) {
      const label = clean(heading.textContent);
      if (!labels.some((word) => label.includes(word))) continue;
      let container = heading.parentElement;
      for (let depth = 0; container && depth < 3; depth++, container = container.parentElement) {
        const full = clean(container.textContent);
        const withoutLabel = clean(full.replace(label, ""));
        if (withoutLabel.length >= 20 && withoutLabel.length <= 6000) return withoutLabel;
      }
      const sibling = heading.nextElementSibling;
      if (sibling) return clean(sibling.textContent);
    }
    return "";
  }

  function nearbyJobMeta() {
    const h1 = document.querySelector("h1");
    if (!h1) return [];
    const texts = [];
    let node = h1.nextElementSibling;
    for (let i = 0; node && i < 4; i++, node = node.nextElementSibling) {
      const value = clean(node.textContent);
      if (value && value.length < 300) texts.push(value);
    }
    const parentText = clean(h1.parentElement?.textContent);
    if (parentText.length < 500) texts.push(parentText.replace(clean(h1.textContent), ""));
    return texts.join(" | ").split(/[|｜·•]/).map(clean).filter(Boolean);
  }

  function inferredCompany() {
    const headerText = clean(document.querySelector("header")?.textContent || document.querySelector("nav")?.textContent);
    const match = headerText.match(/([\u4e00-\u9fa5A-Za-z0-9（）()·&]{2,40}?)(?:校园招聘|招聘官网|社会招聘|招聘)/);
    if (match) return clean(match[1]);
    const site = meta("og:site_name");
    return clean(site.replace(/校园招聘|招聘官网|社会招聘|招聘/g, ""));
  }

  function siteName() {
    const host = location.hostname;
    if (host.includes("zhipin.com")) return "Boss直聘";
    if (host.includes("liepin.com")) return "猎聘";
    if (host.includes("linkedin.com")) return "LinkedIn";
    return "公司官网";
  }

  function extractLinkedIn() {
    return {
      jobTitle: firstText([
        ".job-details-jobs-unified-top-card__job-title h1",
        ".jobs-unified-top-card__job-title", ".top-card-layout__title", "h1"
      ]),
      company: firstText([
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name", ".topcard__org-name-link"
      ]),
      location: firstText([
        ".job-details-jobs-unified-top-card__primary-description-container span",
        ".jobs-unified-top-card__bullet", ".topcard__flavor--bullet"
      ])
    };
  }

  function extractBoss() {
    return {
      jobTitle: firstText([".job-name", ".job-detail-box .name", "h1"]),
      company: firstText([".company-info .company-name", ".sider-company .company-name", ".job-sec .name"]),
      location: firstText([".job-address", ".location-address", ".job-primary .text-city"])
    };
  }

  function extractLiepin() {
    return {
      jobTitle: firstText([".job-apply-content h1", ".job-title-box h1", ".job-title", "h1"]),
      company: firstText([".company-card .company-name", ".company-info .name", ".company-name"]),
      location: firstText([".job-properties .labels", ".job-intro-container .location", ".job-address"])
    };
  }

  function extractGeneric() {
    const job = jobPostingData();
    const parts = titleParts();
    const h1 = firstText(["h1", '[class*="job-title"]', '[class*="position-title"]']);
    const org = firstText([
      '[class*="company-name"]', '[class*="companyName"]', '[data-testid*="company"]',
      '[itemprop="hiringOrganization"] [itemprop="name"]'
    ]);
    const loc = firstText([
      '[class*="job-location"]', '[class*="location"]', '[data-testid*="location"]',
      '[itemprop="jobLocation"]'
    ]);
    const nearby = nearbyJobMeta();
    const inferredLoc = nearby.find((value) =>
      /^[\u4e00-\u9fa5A-Za-z]{2,15}$/.test(value) &&
      !/实习|全职|兼职|校招|社招|招聘|营销|技术|职能|可转正/.test(value)
    );
    return {
      jobTitle: clean(job.title) || h1 || meta("og:title") || parts[0] || "",
      company: clean(job.hiringOrganization?.name) || org || inferredCompany() || parts[1] || location.hostname.replace(/^www\./, ""),
      location: structuredLocation(job) || loc || inferredLoc || "",
      employmentType: clean(Array.isArray(job.employmentType) ? job.employmentType.join("/") : job.employmentType) ||
        nearby.find((value) => /实习|全职|兼职/.test(value)) || "",
      description: stripHtml(job.description) || textAroundHeading(["职位描述", "岗位职责", "工作职责"]),
      requirements: stripHtml(job.qualifications) || textAroundHeading(["职位要求", "任职要求", "岗位要求"])
    };
  }

  function extractJob() {
    const site = siteName();
    const specific = site === "Boss直聘" ? extractBoss()
      : site === "猎聘" ? extractLiepin()
      : site === "LinkedIn" ? extractLinkedIn()
      : extractGeneric();
    const generic = extractGeneric();
    return {
      company: clean(specific.company || generic.company).slice(0, 100),
      jobTitle: clean(specific.jobTitle || generic.jobTitle).slice(0, 120),
      location: clean(specific.location || generic.location).slice(0, 100),
      source: site,
      url: location.href,
      appliedDate: new Date().toISOString().slice(0, 10),
      status: "已投递",
      direction: guessDirection(`${specific.jobTitle} ${document.title}`),
      priority: "中",
      nextAction: "跟进投递结果",
      nextDate: addDays(new Date(), 3),
      notes: [
        generic.employmentType ? `用工类型：${generic.employmentType}` : "",
        generic.description ? `职位描述：${generic.description}` : "",
        generic.requirements ? `职位要求：${generic.requirements}` : ""
      ].filter(Boolean).join("\n")
    };
  }

  function guessDirection(text) {
    const value = text.toLowerCase();
    if (/大宗|commodity|trading|trade operation|贸易运营/.test(value)) return "大宗商品业务";
    if (/海外|international|global|外贸/.test(value) && /销售|sale|business development|bd/.test(value)) return "海外To B销售";
    if (/客户开发|customer development|account development/.test(value)) return "客户开发";
    if (/产业研究|industry research/.test(value)) return "产业研究";
    if (/国际业务|business development|\bbd\b/.test(value)) return "国际业务开发";
    return "其他";
  }

  function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy.toISOString().slice(0, 10);
  }

  function pageLooksLikeJob() {
    const haystack = `${location.href} ${document.title}`.toLowerCase();
    return JOB_WORDS.some((word) => haystack.includes(word.toLowerCase())) ||
      location.hostname.includes("zhipin.com") ||
      location.hostname.includes("liepin.com") ||
      location.hostname.includes("linkedin.com/jobs");
  }

  function showForm(detected = false) {
    document.getElementById("jat-toast")?.remove();
    const data = extractJob();
    const box = document.createElement("div");
    box.id = "jat-toast";
    box.innerHTML = `
      <div class="jat-head"><span>秋招投递助手</span><button class="jat-close" title="关闭">×</button></div>
      <div class="jat-body">
        ${detected ? '<div class="jat-detected">✓ 检测到投递成功，请确认信息</div>' : ""}
        <label>公司名称</label><input data-field="company">
        <label>岗位名称</label><input data-field="jobTitle">
        <div class="jat-grid">
          <div><label>工作地点</label><input data-field="location"></div>
          <div><label>当前流程</label><select data-field="status">
            ${["已投递","笔试/测评","HR面","业务面","终面","Offer沟通","已录用","已拒绝","主动放弃","暂缓"].map(v => `<option>${v}</option>`).join("")}
          </select></div>
        </div>
        <div class="jat-grid">
          <div><label>岗位方向</label><select data-field="direction">
            ${["海外To B销售","国际业务开发","客户开发","大宗商品业务","贸易运营","产业研究","其他"].map(v => `<option>${v}</option>`).join("")}
          </select></div>
          <div><label>优先级</label><select data-field="priority"><option>高</option><option>中</option><option>低</option></select></div>
        </div>
        <div class="jat-grid">
          <div><label>投递日期</label><input type="date" data-field="appliedDate"></div>
          <div><label>下次跟进</label><input type="date" data-field="nextDate"></div>
        </div>
        <label>职位描述与要求（自动提取，可修改）</label>
        <textarea data-field="notes" rows="4"></textarea>
        <div class="jat-actions">
          <button class="jat-btn jat-secondary" data-action="records">查看记录</button>
          <button class="jat-btn jat-primary" data-action="save">保存投递</button>
        </div>
      </div>`;
    document.documentElement.appendChild(box);
    for (const [key, value] of Object.entries(data)) {
      const input = box.querySelector(`[data-field="${key}"]`);
      if (input) input.value = value || "";
    }
    box.querySelector(".jat-close").onclick = () => box.remove();
    box.querySelector('[data-action="records"]').onclick = () => chrome.runtime.sendMessage({ type: "OPEN_RECORDS" });
    box.querySelector('[data-action="save"]').onclick = async () => {
      const record = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      box.querySelectorAll("[data-field]").forEach((el) => { record[el.dataset.field] = clean(el.value); });
      const stored = await chrome.storage.local.get({ applications: [] });
      const duplicate = stored.applications.find((item) =>
        item.url === record.url && item.jobTitle === record.jobTitle && item.appliedDate === record.appliedDate
      );
      if (!duplicate) {
        stored.applications.unshift(record);
        await chrome.storage.local.set({ applications: stored.applications });
      }
      box.querySelector(".jat-body").innerHTML = `<div class="jat-success">${duplicate ? "这条投递已记录，无需重复保存" : "已保存到秋招进度表"}</div>`;
      setTimeout(() => box.remove(), 1800);
    };
  }

  function detectSuccess() {
    if (!pageLooksLikeJob()) return;
    const bodyText = clean(document.body?.innerText).toLowerCase();
    const matched = SUCCESS_WORDS.find((word) => bodyText.includes(word.toLowerCase()));
    if (!matched) return;
    const key = `${location.href}|${matched}`;
    const now = Date.now();
    if (key === lastPromptKey && now - lastPromptAt < 120000) return;
    lastPromptKey = key;
    lastPromptAt = now;
    showForm(true);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GET_JOB_INFO") sendResponse(extractJob());
    if (message?.type === "OPEN_JOB_TRACKER") showForm(false);
  });

  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(detectSuccess, 700);
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(detectSuccess, 1200);
})();

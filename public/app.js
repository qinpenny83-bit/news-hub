var state = { category: "", source: "", query: "", lang: "all", items: [] };

async function loadCategories() {
  try {
    var r = await fetch("/api/feeds");
    var d = await r.json();
    renderCategories(d.categories);
    renderLangFilter();
  } catch (e) {}
}

function renderLangFilter() {
  var nav = document.getElementById("lang-filter");
  nav.innerHTML = "";
  var langs = [
    { key: "all", label: "全部" },
    { key: "zh", label: "中文" },
    { key: "en", label: "English" }
  ];
  langs.forEach(function (l) {
    var btn = document.createElement("button");
    btn.textContent = l.label;
    btn.className = state.lang === l.key ? "active" : "";
    btn.onclick = function () {
      state.lang = l.key;
      nav.querySelectorAll("button").forEach(function (b) { b.className = ""; });
      btn.className = "active";
      loadNews();
    };
    nav.appendChild(btn);
  });
}

function renderCategories(cats) {
  var nav = document.getElementById("categories");
  nav.innerHTML = "";
  var allBtn = document.createElement("button");
  allBtn.textContent = "🔹 全部";
  allBtn.className = "active";
  allBtn.onclick = function () { selectCategory("", allBtn, cats); };
  nav.appendChild(allBtn);
  cats.forEach(function (cat) {
    var btn = document.createElement("button");
    btn.textContent = cat.name;
    btn.onclick = function () { selectCategory(cat.name, btn, cats); };
    nav.appendChild(btn);
    var sel = document.getElementById("source-filter");
    cat.feeds.forEach(function (f) {
      var opt = document.createElement("option");
      opt.value = f.name;
      opt.textContent = (f.lang === "en" ? "🇬🇧 " : "🇨🇳 ") + f.name;
      sel.appendChild(opt);
    });
  });
}

function selectCategory(name, btn, cats) {
  document.querySelectorAll("#categories button").forEach(function (b) { b.className = ""; });
  btn.className = "active";
  state.category = name;
  loadNews();
}

async function loadNews() {
  try {
    var params = new URLSearchParams();
    if (state.category) params.set("category", state.category);
    if (state.source) params.set("source", state.source);
    if (state.lang && state.lang !== "all") params.set("lang", state.lang);
    if (state.query) params.set("q", state.query);
    var r = await fetch("/api/news?" + params.toString());
    var d = await r.json();
    state.items = d.items;
    renderNews(d);
  } catch (e) {}
}

function renderNews(data) {
  var main = document.getElementById("news-list");
  document.getElementById("update-time").textContent = data.updated ? new Date(data.updated).toLocaleString("zh-CN") : "--";
  document.getElementById("news-count").textContent = data.count;
  if (!data.items || data.items.length === 0) {
    main.innerHTML = '<div class="loading">暂无新闻</div>';
    return;
  }
  main.innerHTML = "";
  data.items.forEach(function (item) {
    var div = document.createElement("div");
    div.className = "news-item";

    var meta = document.createElement("div");
    meta.className = "news-meta";

    var badge = document.createElement("span");
    badge.className = "news-lang " + (item.lang === "zh" ? "lang-zh" : "lang-en");
    badge.textContent = item.lang === "zh" ? "中文" : "EN";
    meta.appendChild(badge);

    var src = document.createElement("span");
    src.className = "news-source";
    src.textContent = item.source;
    meta.appendChild(src);

    var cat = document.createElement("span");
    cat.className = "news-category";
    cat.textContent = item.category;
    meta.appendChild(cat);

    var time = document.createElement("span");
    time.className = "news-time";
    try {
      time.textContent = new Date(item.pubDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { time.textContent = ""; }
    meta.appendChild(time);

    div.appendChild(meta);

    var h2 = document.createElement("h2");
    var a = document.createElement("a");
    a.href = item.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = item.title;
    h2.appendChild(a);
    div.appendChild(h2);

    if (item.content) {
      var p = document.createElement("p");
      p.className = "news-desc";
      p.textContent = item.content.substring(0, 200) + (item.content.length > 200 ? "..." : "");
      div.appendChild(p);
    }

    main.appendChild(div);
  });
}

window.rf = async function () {
  var btn = document.getElementById("refresh-btn");
  btn.disabled = true;
  btn.textContent = "更新中...";
  try {
    await fetch("/api/update");
    await loadNews();
  } catch (e) {}
  btn.disabled = false;
  btn.textContent = "🔄 更新新闻";
};

window.doSearch = function () {
  state.query = document.getElementById("search").value;
  loadNews();
};

window.doFilter = function () {
  var sel = document.getElementById("source-filter");
  state.source = sel.value;
  loadNews();
};

loadCategories();
loadNews();

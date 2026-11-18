// ============================================================
// SK-News v4.0 — 단일 파일 Worker (worker.js)
// 구성: 화면(HTML) + 서비스워커 + 뉴스 API + Cron 번역 수집기
// 필요한 연결(대시보드에서 1회): KV 바인딩 "SK_NEWS_KV", AI 바인딩 "AI",
// Cron Trigger "0 * * * *"
// 기사 전문은 저장하지 않습니다. 제목·요약·원문 링크만 KV에 저장합니다.
// ============================================================

const VERSION = '4.7';
const AI_MODEL = '@cf/meta/m2m100-1.2b';
const LLM_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const UA = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const MAX_NEW_PER_RUN = 20;      // 실행 1회당 전체 새로 번역 최대 기사 수 (무료 하위요청 50개 제한 대응)
const MAX_PER_TAB = 5;           // 탭 하나당 1회 번역 상한 (특정 탭이 예산을 독식하지 않게)
const AI_DAILY_CAP = 120;        // AI 번역 하루 상한 (무료 뉴런 10,000 보호장치)
const ITEMS_PER_TAB = 30;        // 탭당 보관 기사 수
const SUMMARY_MAX = 220;         // 요약 최대 글자 수

// locked:true = 유료 장벽 매체 (🔒 표시, 설정에서 숨기기 가능)
const TABS = [
  { id: 'korea',   name: '한국신문',       type: 'links' },
  { id: 'philly',  name: '필라델피아',     type: 'news', feeds: [
    { key: 'inquirer', name: 'Philadelphia Inquirer', url: 'https://www.inquirer.com/arc/outboundfeeds/rss/category/news/?outputType=xml', lang: 'en', locked: false },
    { key: 'whyy',     name: 'WHYY',                  url: 'https://whyy.org/feed/', lang: 'en', locked: false },
  ]},
  { id: 'us',      name: '미국',           type: 'news', feeds: [
    { key: 'npr',  name: 'NPR',              url: 'https://feeds.npr.org/1004/rss.xml', lang: 'en', locked: false },
    { key: 'bbc',  name: 'BBC',              url: 'https://feeds.bbci.co.uk/news/world/rss.xml', lang: 'en', locked: false },
    { key: 'ap',   name: 'AP (Flipboard 경유)', url: 'https://flipboard.com/@AssociatedPress.rss', lang: 'en', locked: false },
    { key: 'nyt',  name: '뉴욕타임스',       url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', lang: 'en', locked: true },
    { key: 'wapo', name: '워싱턴포스트',     url: 'https://feeds.washingtonpost.com/rss/national', lang: 'en', locked: true },
  ]},
  { id: 'invest',  name: '미국 경제·투자', type: 'news', feeds: [
    { key: 'marketwatch', name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', lang: 'en', locked: false },
    { key: 'wsj',         name: '월스트리트저널', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', lang: 'en', locked: true },
  ]},
  { id: 'gangnam', name: '강남 부동산·세금', type: 'news', feeds: [
    { key: 'mkre', name: '매일경제 부동산', url: 'https://www.mk.co.kr/rss/50300009/', lang: 'ko', locked: false },
    { key: 'hkre', name: '한국경제 부동산', url: 'https://www.hankyung.com/feed/realestate', lang: 'ko', locked: false },
    { key: 'yna',  name: '연합뉴스 경제',   url: 'https://www.yna.co.kr/rss/economy.xml', lang: 'ko', locked: false },
  ]},
];

const KR_LINKS = [
  { name: '조선일보',     url: 'https://www.chosun.com/' },
  { name: '미주동아일보', url: 'https://www.donga.com/news/Inter/USA' },
  { name: '미주중앙일보', url: 'https://www.koreadaily.com/index_NY' },
  { name: '미주한국일보', url: 'https://m-ny.koreatimes.com/' },
];

// ---------------- 유틸 ----------------
function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&[a-z]+;/g, ' ')
    .trim();
}
function stripTags(s) {
  return decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return 'h' + (h >>> 0).toString(36);
}
function toGoog(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/-/g, '--').replace(/\./g, '-');
    const q = u.search ? u.search + '&' : '?';
    return `${u.protocol}//${host}.translate.goog${u.pathname}${q}_x_tr_sl=auto&_x_tr_tl=ko&_x_tr_hl=ko&_x_tr_pto=wapp`;
  } catch { return url; }
}

// ---------------- RSS 수집 ----------------
async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
    cf: { cacheTtl: 0 },
  });
  if (!res.ok) throw new Error(feed.key + ' HTTP ' + res.status);
  const xml = await res.text();
  const items = [];
  const blocks = xml.split(/<item[\s>]/).slice(1, 16);
  for (const b of blocks) {
    const pick = (tag) => {
      const m = b.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i'));
      return m ? decodeEntities(m[1]) : '';
    };
    const title = stripTags(pick('title'));
    let link = pick('link');
    if (!link) {
      const m = b.match(/<link[^>]*href="([^"]+)"/i) || b.match(/https?:\/\/[^\s"<]+/);
      link = m ? m[1] : '';
    }
    if (!title || !link) continue;
    items.push({
      id: hashStr(link),
      source: feed.name, sourceKey: feed.key, locked: !!feed.locked, lang: feed.lang,
      titleEn: feed.lang === 'en' ? title : '',
      titleKo: feed.lang === 'ko' ? title : '',
      summaryEn: feed.lang === 'en' ? stripTags(pick('description')).slice(0, SUMMARY_MAX) : '',
      summaryKo: feed.lang === 'ko' ? stripTags(pick('description')).slice(0, SUMMARY_MAX) : '',
      link, goog: toGoog(link),
      date: pick('pubDate') || pick('dc:date') || '',
      translated: feed.lang === 'ko',
    });
  }
  return items;
}

// ---------------- 번역 ----------------
async function translateOne(env, text) {
  if (!text) return '';
  const out = await env.AI.run(AI_MODEL, { text: text.slice(0, 900), source_lang: 'en', target_lang: 'ko' });
  return String(out.translated_text || '').trim();
}

// Google 무료 번역 (키 없음, 결제 계정 없음). 실패하면 Workers AI가 예비로 대신한다.
async function translateGoogle(text) {
  const u = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=' + encodeURIComponent(text.slice(0, 900));
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('google HTTP ' + res.status);
  const data = await res.json();
  const out = ((data && data[0]) || []).map((seg) => seg[0]).join('');
  if (!out) throw new Error('google empty');
  return out;
}

// 제목과 요약을 한 번의 호출로 함께 번역한다.
// 최종 방식(실측 비교 후 확정): 1순위 llama-3.3 (자연스러운 한국어), 예비 m2m100.
// Google 번역 통로는 실제 Cloudflare 환경에서 전부 막힌 것이 확인되어 최종본에서 제외했다.
let aiUsedToday = 0;
let aiCapBlocked = false;
async function translateLLM(env, title, summary) {
  const out = await env.AI.run(LLM_MODEL, { messages: [
    { role: 'system', content: 'You are a professional English-to-Korean news translator. Translate the title and summary into natural Korean. Keep names accurate. Do not add explanations. Output exactly in this format:\nKorean title\n@@@\nKorean summary' },
    { role: 'user', content: 'Title: ' + title + '\nSummary: ' + (summary || '') },
  ], max_tokens: 420 });
  return String(out.response || '').trim();
}
async function translateItem(env, it) {
  if (!env.AI) return;
  if (aiUsedToday >= AI_DAILY_CAP) { aiCapBlocked = true; return; }
  let out = '';
  try { out = await translateLLM(env, it.titleEn, it.summaryEn); it.engine = 'llama'; }
  catch (e) {
    try { out = await translateOne(env, it.titleEn + '\n@@@\n' + (it.summaryEn || '')); it.engine = 'm2m'; }
    catch (e2) { return; }
  }
  aiUsedToday++;
  const parts = String(out).split('@@@');
  it.titleKo = (parts[0] || '').replace(/@+/g, '').replace(/^(한국어 제목|제목)\s*:\s*/, '').trim();
  it.summaryKo = (parts[1] || '').replace(/@+/g, '').replace(/^(한국어 요약|요약)\s*:\s*/, '').trim();
  it.translated = !!it.titleKo;
}

// ---------------- Cron 본작업 ----------------
async function collectAll(env) {
  if (!env.SK_NEWS_KV) return { ok: false, error: 'KV 바인딩(SK_NEWS_KV)이 없습니다' };
  const report = {};
  let budget = MAX_NEW_PER_RUN;
  aiUsedToday = 0; aiCapBlocked = false;
  try {
    const rawAi = await env.SK_NEWS_KV.get('meta:ai');
    if (rawAi) { const d = JSON.parse(rawAi); if (d.date === new Date().toISOString().slice(0, 10)) aiUsedToday = d.count || 0; }
  } catch {}
  // 먼저 각 탭의 기존 상태를 읽어, 가장 오래 기다린 탭부터 처리한다
  const states = [];
  for (const tab of TABS) {
    if (tab.type !== 'news') continue;
    let prev = { items: [], updatedAt: '' };
    try {
      const raw = await env.SK_NEWS_KV.get('news:' + tab.id);
      if (raw) prev = JSON.parse(raw);
    } catch {}
    states.push({ tab, prev });
  }
  states.sort((a, b) => String(a.prev.updatedAt || '').localeCompare(String(b.prev.updatedAt || '')));
  for (const { tab, prev } of states) {
    const prevById = new Map((prev.items || []).map((it) => [it.id, it]));
    // 매체별로 번갈아 섞어야 뒤쪽 매체(유료 매체 포함)가 30개 제한에 밀리지 않음
    const perFeed = [];
    for (const feed of tab.feeds) {
      try { perFeed.push(await fetchFeed(feed)); }
      catch (e) { report[feed.key] = String(e.message || e); perFeed.push([]); }
    }
    let fresh = [];
    for (let i = 0; fresh.length < ITEMS_PER_TAB * 2; i++) {
      let added = false;
      for (const arr of perFeed) if (arr[i]) { fresh.push(arr[i]); added = true; }
      if (!added) break;
    }
    // 새 기사 + 기존 기사 병합 (링크 기준 중복 제거)
    const merged = [];
    const seen = new Set();
    for (const it of fresh) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      merged.push(prevById.get(it.id) || it);
    }
    for (const it of prev.items || []) {
      if (!seen.has(it.id) && merged.length < ITEMS_PER_TAB) { seen.add(it.id); merged.push(it); }
    }
    // 번역: 아직 한글 없는 기사부터, 실행당 상한까지
    let translatedNow = 0;
    if (env.AI) {
      let tabBudget = MAX_PER_TAB;
      for (const it of merged) {
        if (budget <= 0 || tabBudget <= 0) break;
        if (it.lang === 'en' && (!it.titleKo || it.engine !== 'llama')) {
          try {
            await translateItem(env, it);
            if (it.translated) { budget--; tabBudget--; translatedNow++; }
          } catch (e) { report.translate = String(e.message || e); break; }
        }
      }
    }
    const items = merged.slice(0, ITEMS_PER_TAB);
    await env.SK_NEWS_KV.put('news:' + tab.id, JSON.stringify({ updatedAt: new Date().toISOString(), items }));
    report[tab.id] = { total: items.length, translatedNow };
  }
  try { await env.SK_NEWS_KV.put('meta:ai', JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: aiUsedToday })); } catch {}
  if (aiCapBlocked) report.ai = '오늘 AI 예비 사용 상한(' + AI_DAILY_CAP + ') 도달 — 나머지는 다음에 번역됩니다';
  return { ok: true, at: new Date().toISOString(), report };
}

// ---------------- 화면(HTML) ----------------
const HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<title>SK-News</title>
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon-192.png">
<link rel="apple-touch-icon" href="/icon-192.png">
<style>
  :root{ --ink:#171717; --sub:#666; --line:#e3e3e3; --accent:#c8102e; --card:#fff; --bg:#fff; }
  body.dark{ --ink:#f2f2f2; --sub:#aaa; --line:#333; --card:#1c1c1c; --bg:#121212; }
  *{ box-sizing:border-box; }
  body{ margin:0; font-family:-apple-system,'Malgun Gothic',sans-serif; background:var(--bg); color:var(--ink); }
  header{ position:sticky; top:0; background:var(--bg); z-index:10; border-bottom:2px solid var(--ink); }
  .top{ display:flex; align-items:center; justify-content:space-between; padding:10px 14px 4px; }
  .logo{ font-family:'Nanum Myeongjo','Batang',serif; font-weight:800; font-size:30px; letter-spacing:.5px; }
  .logo em{ color:var(--accent); font-style:normal; }
  .gear{ font-size:24px; background:none; border:none; color:var(--ink); min-width:48px; min-height:48px; cursor:pointer; }
  nav.tabs{ display:flex; overflow-x:auto; scrollbar-width:none; }
  nav.tabs::-webkit-scrollbar{ display:none; }
  nav.tabs button{ flex:0 0 auto; background:none; border:none; border-bottom:3px solid transparent; color:var(--ink);
    font-size:17px; font-weight:700; padding:12px 14px; min-height:48px; cursor:pointer; white-space:nowrap; }
  nav.tabs button.on{ border-bottom-color:var(--accent); color:var(--accent); }
  main{ max-width:760px; margin:0 auto; padding:10px 14px 40px; }
  .upd{ color:var(--sub); font-size:13px; padding:6px 0 2px; }
  .card{ background:var(--card); border-bottom:1px solid var(--line); padding:16px 2px; }
  .card h2{ font-size:calc(20px * var(--fs,1)); line-height:1.35; margin:0 0 8px; font-weight:800; }
  .card p.sum{ font-size:calc(16px * var(--fs,1)); line-height:1.65; margin:0 0 10px; color:var(--ink); }
  .meta{ color:var(--sub); font-size:13px; margin-bottom:10px; }
  details.en{ margin:6px 0 10px; }
  details.en summary{ color:var(--sub); font-size:14px; min-height:48px; display:flex; align-items:center; cursor:pointer; }
  details.en div{ font-size:15px; line-height:1.6; color:var(--sub); padding:4px 0 8px; }
  .btns{ display:flex; gap:8px; flex-wrap:wrap; }
  .btn{ display:inline-flex; align-items:center; min-height:48px; padding:10px 16px; border-radius:10px;
    font-size:16px; font-weight:800; border:1px solid var(--ink); background:var(--bg); color:var(--ink);
    text-decoration:none; cursor:pointer; }
  .btn.main{ background:#ffcb05; border-color:#d9ad00; color:#171717; }
  .lock-note{ font-size:13px; color:var(--sub); margin-top:8px; line-height:1.5; }
  .kr-links{ width:70%; margin:14px auto; display:flex; flex-direction:column; gap:12px; }
  .kr-links a{ display:flex; justify-content:space-between; align-items:center; background:#ffcb05; color:#171717;
    border:1px solid #d9ad00; border-radius:14px; padding:16px 20px; font-size:19px; font-weight:800;
    text-decoration:none; min-height:56px; }
  .empty{ padding:48px 10px; text-align:center; color:var(--sub); line-height:1.8; font-size:16px; }
  .empty button, .primary{ min-height:48px; padding:10px 20px; font-size:16px; font-weight:800; border-radius:10px;
    border:1px solid var(--ink); background:var(--bg); color:var(--ink); cursor:pointer; }
  footer{ color:var(--sub); font-size:13px; line-height:1.7; padding:24px 14px 40px; text-align:center; }
  dialog{ border:1px solid var(--line); border-radius:14px; background:var(--bg); color:var(--ink); width:min(92vw,420px); }
  dialog::backdrop{ background:rgba(0,0,0,.45); }
  .row{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 0; border-bottom:1px solid var(--line); }
  .row label{ font-size:16px; font-weight:700; }
  .seg{ display:flex; gap:6px; flex-wrap:wrap; }
  .seg button{ min-height:48px; padding:8px 12px; border-radius:8px; border:1px solid var(--line); background:var(--bg); color:var(--ink); font-size:15px; cursor:pointer; }
  .seg button.on{ background:#ffcb05; color:#171717; font-weight:800; }
  .spinner{ text-align:center; padding:60px 0; color:var(--sub); font-size:16px; }
</style>
</head>
<body>
<header>
  <div class="top"><div class="logo">SK<em>-</em>News</div><button class="gear" id="gear" aria-label="설정">⚙️</button></div>
  <nav class="tabs" id="tabs"></nav>
</header>
<main id="main"><div class="spinner">불러오는 중입니다…</div></main>
<footer>SK-News · 기사 저작권은 각 언론사에 있습니다.<br>번역에는 오류가 있을 수 있습니다.<br>현재 버전 <b id="ver"></b></footer>

<dialog id="settings">
  <h3 style="margin:4px 0 8px">설정</h3>
  <div class="row"><label>글자 크기</label>
    <div class="seg" id="fs-seg">
      <button data-fs="0.9">작게</button><button data-fs="1">보통</button><button data-fs="1.12">크게</button><button data-fs="1.25">아주 크게</button>
    </div></div>
  <div class="row"><label>다크모드</label><input type="checkbox" id="dark-toggle" style="width:26px;height:26px"></div>
  <div class="row"><label>🔒 유료 매체 기사 보이기</label><input type="checkbox" id="lock-toggle" style="width:26px;height:26px"></div>
  <div class="row"><label>뉴스 새로고침</label><button class="primary" id="refresh-btn">새로고침</button></div>
  <div class="row"><label>새 버전으로 지금 업데이트</label><button class="primary" id="update-btn">지금 업데이트</button></div>
  <div class="row"><label>현재 버전</label><b id="ver2"></b></div>
  <div style="text-align:right;padding-top:12px"><button class="primary" id="close-settings">닫기</button></div>
</dialog>

<script>
const VERSION = '${VERSION}';
const TABS = ${'__TABS_JSON__'};
const KR_LINKS = ${'__KR_JSON__'};
let curTab = localStorage.getItem('sk4-tab') || 'philly';
if (!TABS.some(t => t.id === curTab)) curTab = 'philly';
const showLocked = () => localStorage.getItem('sk4-lock') !== '0';

function relTime(d) {
  if (!d) return '';
  const t = new Date(d).getTime();
  if (isNaN(t)) return '';
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (m < 60) return m + '분 전';
  const h = Math.round(m / 60);
  if (h < 24) return h + '시간 전';
  return Math.round(h / 24) + '일 전';
}
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function renderTabs() {
  document.getElementById('tabs').innerHTML = TABS.map(t =>
    '<button data-tab="' + t.id + '" class="' + (t.id === curTab ? 'on' : '') + '">' + esc(t.name) + '</button>').join('');
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
    curTab = b.dataset.tab; localStorage.setItem('sk4-tab', curTab); renderTabs(); load();
  });
}

async function load() {
  const main = document.getElementById('main');
  if (curTab === 'korea') {
    main.innerHTML = '<div class="upd">누르면 새 창에서 신문이 열립니다.</div><div class="kr-links">' +
      KR_LINKS.map(l => '<a href="' + l.url + '" target="_blank" rel="noopener noreferrer">' + esc(l.name) + '<span>열기 ↗</span></a>').join('') +
      '</div><div class="empty">버튼을 누르면 새 창에서 해당 신문이 열립니다.<br>신문 사이트 자체가 무거워 열리는 데 시간이 걸릴 수 있습니다.</div>';
    return;
  }
  main.innerHTML = '<div class="spinner">불러오는 중입니다…</div>';
  try {
    const res = await fetch('/api/news?tab=' + encodeURIComponent(curTab), { cache: 'no-store' });
    const data = await res.json();
    if (!data.items || !data.items.length) {
      main.innerHTML = '<div class="empty">아직 준비된 뉴스가 없습니다.<br>서버가 한 시간마다 새 뉴스를 한글로 준비합니다.<br>잠시 후 다시 눌러 주세요.<br><br><button onclick="load()">다시 시도</button></div>';
      return;
    }
    const items = data.items.filter(it => showLocked() || !it.locked);
    const untranslated = data.items.some(it => it.lang === 'en' && !it.titleKo);
    let html = '<div class="upd">마지막 준비: ' + (data.updatedAt ? new Date(data.updatedAt).toLocaleString('ko-KR') : '-') +
      (untranslated ? ' · 일부 기사는 번역 대기 중입니다(다음 시간에 한글로 바뀝니다)' : '') + '</div>';
    html += items.map(it => {
      const title = it.titleKo || it.titleEn || '';
      const sum = it.summaryKo || it.summaryEn || '';
      let h = '<article class="card"><h2>' + (it.locked ? '🔒 ' : '') + esc(title) + '</h2>';
      if (sum) h += '<p class="sum">' + esc(sum) + '</p>';
      h += '<div class="meta">' + esc(it.source) + (it.date ? ' · ' + relTime(it.date) : '') + '</div>';
      if (it.titleEn && it.titleKo) h += '<details class="en"><summary>영어 원제목 보기</summary><div>' + esc(it.titleEn) + '</div></details>';
      if (it.locked) {
        h += '<div class="btns"><a class="btn" href="' + esc(it.link) + '" target="_blank" rel="noopener noreferrer">원문 열기 ↗</a></div>' +
             '<div class="lock-note">유료 매체라 본문이 중간에 막힐 수 있습니다. 막히면 뒤로 가기로 돌아오세요.</div>';
      } else {
        h += '<div class="btns"><a class="btn main" href="' + esc(it.goog) + '" target="_blank" rel="noopener noreferrer">본문 한글로 보기 ↗</a>' +
             '<a class="btn" href="' + esc(it.link) + '" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a></div>';
      }
      return h + '</article>';
    }).join('');
    main.innerHTML = html || '<div class="empty">표시할 뉴스가 없습니다. 설정에서 "유료 매체 기사 보이기"를 켜 보세요.</div>';
  } catch (e) {
    main.innerHTML = '<div class="empty">뉴스를 불러오지 못했습니다.<br>인터넷 연결을 확인해 주세요.<br><br><button onclick="load()">다시 시도</button></div>';
  }
}

// 설정
const dlg = document.getElementById('settings');
document.getElementById('gear').onclick = () => dlg.showModal();
document.getElementById('close-settings').onclick = () => dlg.close();
function applyPrefs() {
  const fs = localStorage.getItem('sk4-fs') || '1.12';
  document.documentElement.style.setProperty('--fs', fs);
  document.querySelectorAll('#fs-seg button').forEach(b => b.classList.toggle('on', b.dataset.fs === fs));
  const dark = localStorage.getItem('sk4-dark') === '1';
  document.body.classList.toggle('dark', dark);
  document.getElementById('dark-toggle').checked = dark;
  document.getElementById('lock-toggle').checked = showLocked();
  document.getElementById('ver').textContent = 'v' + VERSION;
  document.getElementById('ver2').textContent = 'v' + VERSION;
}
document.querySelectorAll('#fs-seg button').forEach(b => b.onclick = () => { localStorage.setItem('sk4-fs', b.dataset.fs); applyPrefs(); });
document.getElementById('dark-toggle').onchange = (e) => { localStorage.setItem('sk4-dark', e.target.checked ? '1' : '0'); applyPrefs(); };
document.getElementById('lock-toggle').onchange = (e) => { localStorage.setItem('sk4-lock', e.target.checked ? '1' : '0'); load(); };
document.getElementById('refresh-btn').onclick = () => { dlg.close(); load(); };
document.getElementById('update-btn').onclick = async () => {
  try {
    if ('serviceWorker' in navigator) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); }
    if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
  } catch {}
  location.replace('/?v=' + Date.now());
};
applyPrefs(); renderTabs(); load();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
</script>
</body>
</html>`;

const SW = `const CACHE = 'sk-news-shell-v${VERSION}';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); return; }
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});`;

const ICON192 = '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';
const ICON512 = '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AABARCEAAAAiCgEAABBRCAAAgIhCAAAARBQCAAAgohAAAAARhQAAAIgoBAAAQEQhAAAAIgoBAAAQUQgAAICIQgAAAEQUAgAAIKIQAAAAEYUAAACIKAQAAEBEIQAAACIKAQAAEFEIAACAiEIAAABEFAIAACCiEAAAABGFAAAAiCgEAABARCEAAAAiCgEAABBRCAAAgIhCAAAARBQCAAAgohAAAAARhQAAAIgoBAAAQEQhAAAAIgoBAAAQUQgAAICIQgAAAEQUAgAAIKIQAAAAEYUAAACIKAQAAEBEIQAAACIKAQAAEFEIAACAiEIAAABEFAIAACCiEAAAABGFAAAAiCgEAABARCEAAAAiCgEAABBRCAAAgIhCAAAARBQCAAAgohAAAAARhQAAAIgoBAAAQEQhAAAAIgoBAAAQUQgAAICIQgAAAEQUAgAAIKIQAAAAEYUAAACIKAQAAEBEIQAAACIKAQAAEFEIAACAiEIAAABEFAIAACCiEAAAABGFAAAAiCgEAABARCEAAAAiCgEAABBRCAAAgIhCAAAARBQCAAAgohAAAAARhQAAAIgoBAAAQEQhAAAAIgoBAAAQUQgAAICIQgAAAEQUAgAAIKIQAAAAEYUAAACIKAQAAEBEIQAAACIKAQAAEFEIAACAiEIAAABEFAIAACCiEAAAABGFAAAAiCgEAABARCEAAAAiCgEAABBRCAAAgIhCAAAARBQCAAAgohAAAAARhQAAAIgoBAAAQEQhAAAAIgoBAAAQUQgAAICIQgAAAEQUAgAAIKIQAAAAEYUAAACIKAQAAEBEIQAAACIKAQAAEFEIAACAiEIAAABEFAIAACCiEAAAABH1/wGMvV0tSaYxtgAAAABJRU5ErkJggg==';
function iconResponse(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Response(arr, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/') {
      const html = HTML
        .replace('__TABS_JSON__', JSON.stringify(TABS.map((t) => ({ id: t.id, name: t.name }))))
        .replace('__KR_JSON__', JSON.stringify(KR_LINKS));
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/sw.js') return new Response(SW, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' } });
    if (url.pathname === '/manifest.webmanifest') {
      return json({ name: 'SK-News', short_name: 'SK-News', start_url: '/', display: 'standalone', background_color: '#ffffff', theme_color: '#ffffff',
        icons: [ { src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' } ] });
    }
    if (url.pathname === '/icon-192.png') return iconResponse(ICON192);
    if (url.pathname === '/icon-512.png') return iconResponse(ICON512);
    if (url.pathname === '/api/news') {
      const tab = url.searchParams.get('tab') || 'philly';
      if (!env.SK_NEWS_KV) return json({ items: [], error: 'KV 바인딩이 없습니다' });
      const raw = await env.SK_NEWS_KV.get('news:' + tab);
      if (!raw) return json({ items: [], updatedAt: '' });
      return new Response(raw, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/aitest2') {        // 번역 방식 비교 시험 (m2m100 vs 일반 AI)
      if (!env.AI) return json({ ok: false, error: 'AI 바인딩이 없습니다' });
      const titles = [];
      for (const feed of [TABS[2].feeds[0], TABS[2].feeds[1], TABS[1].feeds[0], TABS[3].feeds[0]]) {
        try { (await fetchFeed(feed)).slice(0, 2).forEach((it) => titles.push(it.titleEn)); } catch {}
        if (titles.length >= 5) break;
      }
      const results = [];
      for (const t of titles.slice(0, 5)) {
        let m2m = '', llama = '';
        try { m2m = await translateOne(env, t); } catch (e) { m2m = '오류: ' + String(e.message || e); }
        try {
          const out = await env.AI.run(LLM_MODEL, { messages: [
            { role: 'system', content: 'You are a professional English-to-Korean news translator. Translate the given English news headline into natural Korean. Output only the Korean translation, nothing else.' },
            { role: 'user', content: t },
          ], max_tokens: 160 });
          llama = String(out.response || '').trim();
        } catch (e) { llama = '오류: ' + String(e.message || e); }
        results.push({ en: t, m2m100: m2m, llama: llama });
      }
      return json({ ok: true, note: '같은 제목을 두 방식으로 번역한 비교입니다. m2m100=지금 방식, llama=새 시험 방식', results });
    }
    if (url.pathname === '/api/status') {
      const tabs = {};
      if (env.SK_NEWS_KV) {
        for (const t of TABS) {
          if (t.type !== 'news') continue;
          const raw = await env.SK_NEWS_KV.get('news:' + t.id);
          if (raw) { const d = JSON.parse(raw); tabs[t.id] = { count: d.items.length, updatedAt: d.updatedAt }; }
          else tabs[t.id] = { count: 0, updatedAt: '' };
        }
      }
      return json({ version: VERSION, kv: !!env.SK_NEWS_KV, ai: !!env.AI, tabs });
    }
    if (url.pathname === '/api/collect') {           // 수동 수집(테스트/초기 채움용)
      const r = await collectAll(env);
      return json(r, r.ok ? 200 : 500);
    }
    if (url.pathname === '/api/aitest') {            // 실제 제목 10개 번역 테스트
      if (!env.AI) return json({ ok: false, error: 'AI 바인딩이 없습니다' });
      const titles = [];
      for (const feed of [TABS[2].feeds[0], TABS[2].feeds[1], TABS[1].feeds[0], TABS[3].feeds[0]]) {
        try { (await fetchFeed(feed)).slice(0, 3).forEach((it) => titles.push(it.titleEn)); } catch {}
        if (titles.length >= 10) break;
      }
      const results = [];
      for (const t of titles.slice(0, 10)) {
        const it = { titleEn: t, summaryEn: '', titleKo: '', summaryKo: '', engine: '' };
        await translateItem(env, it);
        results.push({ en: t, ko: it.titleKo, engine: it.engine || 'failed' });
      }
      return json({ ok: true, note: 'engine이 google이면 Google 번역, ai이면 예비 AI 번역입니다. 뉴런 소모량은 대시보드 Workers AI 사용량 화면에서 확인하세요.', results });
    }
    return new Response('Not Found', { status: 404 });
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(collectAll(env));
  },
};

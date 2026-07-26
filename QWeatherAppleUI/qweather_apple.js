/**
 * QWeather Severe Weather -> Apple Weather style
 * Surge response-body script
 *
 * Rule example:
 * http-response ^https:\/\/(?:www\.)?qweather\.com\/(?:en\/)?severe-weather\/.*\.html requires-body=1,max-size=0,script-path=qweather_apple.js
 */

(function () {
  'use strict';

  const originalBody = $response.body || '';
  if (!originalBody || !/<html[\s>]/i.test(originalBody)) {
    $done({});
    return;
  }

  function decodeHtml(input) {
    return String(input || '')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(Number(n)); })
      .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); })
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function escapeHtml(input) {
    return String(input || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function firstMatch(source, regex, fallback) {
    const match = source.match(regex);
    return match ? decodeHtml(match[1]) : fallback;
  }

  function normalizeDate(raw) {
    if (!raw) return '';
    const value = raw.replace(/^Issue date:\s*/i, '').trim();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    try {
      return new Intl.DateTimeFormat('zh-CN', {
        month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
      }).format(date);
    } catch (_) {
      return value;
    }
  }

  function severityInfo(className, title) {
    const source = (className + ' ' + title).toLowerCase();
    if (/warning--red|红色|\bred\b/.test(source)) return { key: 'red', label: '极端', color: '#ff453a', glow: 'rgba(255,69,58,.38)' };
    if (/warning--orange|橙色|\borange\b/.test(source)) return { key: 'orange', label: '严重', color: '#ff9f0a', glow: 'rgba(255,159,10,.36)' };
    if (/warning--yellow|黄色|\byellow\b/.test(source)) return { key: 'yellow', label: '较重', color: '#ffd60a', glow: 'rgba(255,214,10,.34)' };
    if (/warning--blue|蓝色|\bblue\b/.test(source)) return { key: 'blue', label: '一般', color: '#0a84ff', glow: 'rgba(10,132,255,.34)' };
    return { key: 'gray', label: '预警', color: '#8e8e93', glow: 'rgba(142,142,147,.30)' };
  }

  function iconFor(title) {
    const t = title || '';
    if (/暴雨|rainstorm|heavy rain/i.test(t)) return 'cloud.heavyrain.fill';
    if (/雷|thunder|lightning/i.test(t)) return 'cloud.bolt.rain.fill';
    if (/大风|wind|gale|typhoon|台风/i.test(t)) return 'wind';
    if (/高温|heat|temperature/i.test(t)) return 'thermometer.sun.fill';
    if (/寒潮|cold|freeze|frost|冰冻/i.test(t)) return 'thermometer.snowflake';
    if (/雪|snow|blizzard/i.test(t)) return 'snowflake';
    if (/雾|fog|haze/i.test(t)) return 'cloud.fog.fill';
    if (/冰雹|hail/i.test(t)) return 'cloud.hail.fill';
    if (/洪水|flood/i.test(t)) return 'water.waves';
    return 'exclamationmark.triangle.fill';
  }

  function iconSvg(name) {
    const common = 'viewBox="0 0 64 64" aria-hidden="true"';
    if (name === 'cloud.heavyrain.fill') return `<svg ${common}><path d="M19 39h27a11 11 0 0 0 1-22 16 16 0 0 0-30-1A12 12 0 0 0 19 39Z" fill="currentColor"/><path d="M20 45l-4 9M32 45l-4 9M44 45l-4 9" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;
    if (name === 'cloud.bolt.rain.fill') return `<svg ${common}><path d="M18 38h29a11 11 0 0 0 0-22 16 16 0 0 0-30-1A12 12 0 0 0 18 38Z" fill="currentColor"/><path d="M34 39l-8 12h7l-3 10 11-15h-7l4-7Z" fill="currentColor"/></svg>`;
    if (name === 'wind') return `<svg ${common}><path d="M8 23h32c9 0 9-12 1-12-5 0-7 4-7 7M8 32h42c8 0 8 12 0 12-5 0-7-4-7-7M8 42h23" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;
    if (name === 'thermometer.sun.fill') return `<svg ${common}><circle cx="45" cy="18" r="9" fill="currentColor"/><path d="M25 12a7 7 0 0 0-14 0v25a13 13 0 1 0 14 0V12Zm-7 40a7 7 0 0 1-3-13V17h6v22a7 7 0 0 1-3 13Z" fill="currentColor"/></svg>`;
    if (name === 'thermometer.snowflake') return `<svg ${common}><path d="M25 12a7 7 0 0 0-14 0v25a13 13 0 1 0 14 0V12Zm-7 40a7 7 0 0 1-3-13V23h6v16a7 7 0 0 1-3 13Z" fill="currentColor"/><path d="M43 15v20M34 20l18 10M52 20 34 30" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
    if (name === 'snowflake') return `<svg ${common}><path d="M32 6v52M10 19l44 26M54 19 10 45M25 10l7 7 7-7M25 54l7-7 7 7M10 28l10 3-3 10M54 28l-10 3 3 10" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    if (name === 'cloud.fog.fill') return `<svg ${common}><path d="M18 34h29a10 10 0 0 0 0-20 15 15 0 0 0-29-1A11 11 0 0 0 18 34Z" fill="currentColor"/><path d="M10 42h44M16 50h34M23 58h23" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;
    if (name === 'cloud.hail.fill') return `<svg ${common}><path d="M18 36h29a11 11 0 0 0 0-22 16 16 0 0 0-30-1A12 12 0 0 0 18 36Z" fill="currentColor"/><circle cx="20" cy="48" r="3" fill="currentColor"/><circle cx="32" cy="55" r="3" fill="currentColor"/><circle cx="44" cy="48" r="3" fill="currentColor"/></svg>`;
    if (name === 'water.waves') return `<svg ${common}><path d="M8 22c8 0 8 6 16 6s8-6 16-6 8 6 16 6M8 35c8 0 8 6 16 6s8-6 16-6 8 6 16 6M8 48c8 0 8 6 16 6s8-6 16-6 8 6 16 6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;
    return `<svg ${common}><path d="M32 6 59 54H5L32 6Z" fill="currentColor"/><path d="M32 22v16M32 46v1" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`;
  }

  const pageTitle = firstMatch(originalBody, /<title>([\s\S]*?)<\/title>/i, '天气预警');
  let city = pageTitle.replace(/\s*(?:severe weather warning|灾害预警|天气预警).*$/i, '').trim();
  if (!city || city === pageTitle) {
    city = firstMatch(originalBody, /<h1[^>]*>([\s\S]*?)<\/h1>/i, '当前位置');
  }

  const cards = [];
  const cardRegex = /<div class="c-city-warning-events\s+([^"]*)">([\s\S]*?)(?=<div class="c-city-warning-events\s|<\/div>\s*<\/div>\s*<\/div>\s*(?:<div|$))/gi;
  let cardMatch;
  while ((cardMatch = cardRegex.exec(originalBody)) !== null) {
    const block = cardMatch[2];
    const title = firstMatch(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i, '天气预警');
    const issue = firstMatch(block, /<p[^>]*>\s*(Issue date:[\s\S]*?)<\/p>/i, '');
    const text = firstMatch(block, /<p class="warning-events__txt"[^>]*>([\s\S]*?)<\/p>/i, '');
    const description = firstMatch(block, /<h4[^>]*>\s*Description\s*<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/i, '');
    const guide = firstMatch(block, /<h4[^>]*>\s*(?:Defense Guide|Defence Guide|Guidelines?|防御指南)\s*<\/h4>([\s\S]*?)(?=<\/div>\s*<\/div>|<h4|$)/i, '');
    if (title || text) {
      cards.push({ title, issue: normalizeDate(issue), text, description, guide, severity: severityInfo(cardMatch[1], title) });
    }
  }

  // More tolerant fallback for markup changes.
  if (!cards.length) {
    const eventRegex = /<div class="c-city-warning-events\s+([^"]*)">([\s\S]*?)<div class="warning-explain">([\s\S]*?)<\/div>\s*<\/div>/gi;
    while ((cardMatch = eventRegex.exec(originalBody)) !== null) {
      const block = cardMatch[2] + cardMatch[3];
      const title = firstMatch(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i, '天气预警');
      cards.push({
        title,
        issue: normalizeDate(firstMatch(block, /<p[^>]*>\s*(Issue date:[\s\S]*?)<\/p>/i, '')),
        text: firstMatch(block, /<p class="warning-events__txt"[^>]*>([\s\S]*?)<\/p>/i, ''),
        description: firstMatch(block, /<h4[^>]*>\s*Description\s*<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/i, ''),
        guide: '',
        severity: severityInfo(cardMatch[1], title)
      });
    }
  }

  if (!cards.length) {
    $done({});
    return;
  }

  const primary = cards[0].severity;
  const cardsHtml = cards.map(function (item, index) {
    const guideParagraphs = item.guide
      ? item.guide.split(/(?:\n|(?=\d+[.、]))+/).map(function (x) { return x.trim(); }).filter(Boolean)
      : [];
    return `
      <article class="alert-card" style="--accent:${item.severity.color};--glow:${item.severity.glow}">
        <div class="alert-header">
          <div class="weather-icon">${iconSvg(iconFor(item.title))}</div>
          <div class="alert-heading">
            <div class="eyebrow"><span class="level-dot"></span>${escapeHtml(item.severity.label)}天气预警${index === 0 ? '<span class="live">当前</span>' : ''}</div>
            <h2>${escapeHtml(item.title)}</h2>
            ${item.issue ? `<time>${escapeHtml(item.issue)}发布</time>` : ''}
          </div>
        </div>
        ${item.text ? `<section><h3>预警内容</h3><p>${escapeHtml(item.text).replace(/\n/g, '<br>')}</p></section>` : ''}
        ${item.description ? `<section><h3>预警标准</h3><p>${escapeHtml(item.description).replace(/\n/g, '<br>')}</p></section>` : ''}
        ${guideParagraphs.length ? `<section><h3>安全建议</h3><ol>${guideParagraphs.map(function (p) { return `<li>${escapeHtml(p.replace(/^\d+[.、]\s*/, ''))}</li>`; }).join('')}</ol></section>` : ''}
      </article>`;
  }).join('');

  const output = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(city)}天气预警</title>
<style>
:root{--accent:${primary.color};--glow:${primary.glow};--bg:#eef5ff;--text:#111318;--secondary:rgba(17,19,24,.62);--card:rgba(255,255,255,.66);--line:rgba(0,0,0,.08);--shadow:0 24px 70px rgba(28,56,96,.18)}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif;color:var(--text)}
body{background:radial-gradient(circle at 16% -8%,var(--glow),transparent 33rem),radial-gradient(circle at 95% 12%,rgba(89,170,255,.30),transparent 30rem),linear-gradient(180deg,#dceaff 0%,#f5f8fc 42%,#edf2f8 100%);background-attachment:fixed;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
body:before{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.30),transparent 42%)}
.page{width:min(760px,100%);margin:0 auto;padding:24px 18px 44px;position:relative}
.topbar{display:flex;align-items:center;justify-content:space-between;margin:2px 2px 30px}.brand{font-size:15px;font-weight:650;letter-spacing:-.01em}.source{font-size:12px;color:var(--secondary);padding:7px 11px;border:1px solid rgba(255,255,255,.48);background:rgba(255,255,255,.32);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:999px}
.hero{padding:10px 4px 26px}.hero .label{font-size:14px;color:var(--secondary);font-weight:600}.hero h1{font-size:clamp(42px,12vw,72px);line-height:.96;letter-spacing:-.055em;margin:10px 0 15px;font-weight:750}.hero p{font-size:17px;color:var(--secondary);margin:0;font-weight:500}
.alert-card{position:relative;overflow:hidden;background:var(--card);border:1px solid rgba(255,255,255,.72);box-shadow:var(--shadow),inset 0 1px 0 rgba(255,255,255,.7);backdrop-filter:blur(34px) saturate(145%);-webkit-backdrop-filter:blur(34px) saturate(145%);border-radius:30px;padding:24px;margin:0 0 18px}.alert-card:before{content:"";position:absolute;inset:0 0 auto;height:5px;background:var(--accent)}.alert-card:after{content:"";position:absolute;width:180px;height:180px;border-radius:50%;background:var(--glow);filter:blur(30px);right:-75px;top:-90px;pointer-events:none}
.alert-header{display:flex;gap:17px;align-items:flex-start;position:relative;z-index:1}.weather-icon{flex:0 0 58px;width:58px;height:58px;color:var(--accent);filter:drop-shadow(0 8px 18px var(--glow))}.weather-icon svg{width:100%;height:100%}.alert-heading{min-width:0}.eyebrow{display:flex;align-items:center;gap:7px;color:var(--secondary);font-size:13px;font-weight:650}.level-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 5px var(--glow)}.live{margin-left:4px;padding:3px 7px;border-radius:99px;color:var(--accent);background:var(--glow);font-size:11px}.alert-heading h2{font-size:24px;line-height:1.18;letter-spacing:-.025em;margin:7px 0 7px}.alert-heading time{font-size:13px;color:var(--secondary)}
section{border-top:1px solid var(--line);margin-top:22px;padding-top:19px;position:relative;z-index:1}section h3{font-size:13px;letter-spacing:.02em;margin:0 0 9px;color:var(--secondary);font-weight:700}section p,section li{font-size:16px;line-height:1.62;letter-spacing:-.005em}section p{margin:0}ol{margin:0;padding-left:22px}li+li{margin-top:8px}
.footer{text-align:center;color:var(--secondary);font-size:12px;padding:14px 0 0}.footer a{color:inherit;text-decoration:none}
@media(max-width:480px){.page{padding-left:14px;padding-right:14px}.alert-card{padding:21px;border-radius:26px}.weather-icon{flex-basis:50px;width:50px;height:50px}.alert-heading h2{font-size:21px}}
@media(prefers-color-scheme:dark){:root{--bg:#070b13;--text:#f5f7fb;--secondary:rgba(235,240,249,.62);--card:rgba(25,31,43,.69);--line:rgba(255,255,255,.09);--shadow:0 25px 85px rgba(0,0,0,.38)}body{background:radial-gradient(circle at 15% -5%,var(--glow),transparent 30rem),radial-gradient(circle at 95% 8%,rgba(20,87,154,.38),transparent 28rem),linear-gradient(180deg,#101b2c 0%,#080c14 50%,#05070b 100%)}body:before{background:linear-gradient(120deg,rgba(255,255,255,.05),transparent 40%)}.source{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.12)}.alert-card{border-color:rgba(255,255,255,.10);box-shadow:var(--shadow),inset 0 1px 0 rgba(255,255,255,.08)}}
</style>
</head>
<body>
<main class="page">
  <header class="topbar"><div class="brand">天气</div><div class="source">数据来自 QWeather</div></header>
  <section class="hero"><div class="label">恶劣天气</div><h1>${escapeHtml(city)}</h1><p>当前共有 ${cards.length} 条生效预警</p></section>
  ${cardsHtml}
  <footer class="footer">页面由 Surge 在本地重新呈现 · 原始数据版权归发布机构与 QWeather 所有</footer>
</main>
</body>
</html>`;

  const headers = Object.assign({}, $response.headers || {});
  Object.keys(headers).forEach(function (key) {
    const lower = key.toLowerCase();
    if (lower === 'content-encoding' || lower === 'content-length' || lower === 'content-security-policy' || lower === 'x-content-security-policy') {
      delete headers[key];
    }
  });
  headers['Content-Type'] = 'text/html; charset=utf-8';
  headers['Cache-Control'] = 'no-store';

  $done({ response: { status: $response.status || 200, headers: headers, body: output } });
})();

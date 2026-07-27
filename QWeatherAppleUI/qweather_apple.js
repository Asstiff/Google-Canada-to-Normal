/**
 * QWeather Severe Weather -> Apple Weather Alert
 * Surge http-response script
 *
 * IMPORTANT: This is a response script. The result must be returned at the
 * top level of $done({ status, headers, body }), not inside response:{}.
 */
(function () {
  'use strict';

  var originalBody = typeof $response.body === 'string' ? $response.body : '';
  var requestUrl = ($request && $request.url) || '';

  function finishUnchanged(reason) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[QWeather Apple] unchanged: ' + reason);
    }
    $done({});
  }

  if (!originalBody || !/<html[\s>]/i.test(originalBody)) {
    finishUnchanged('response is not an HTML document');
    return;
  }

  function decodeHtml(value) {
    return String(value || '')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(Number(n)); })
      .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); })
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function firstMatch(source, regex, fallback) {
    var match = String(source || '').match(regex);
    return match ? decodeHtml(match[1]) : (fallback || '');
  }

  function queryParameter(name) {
    var match = requestUrl.match(new RegExp('[?&]' + name + '=([^&#]*)', 'i'));
    if (!match) return '';
    try { return decodeURIComponent(match[1].replace(/\+/g, ' ')); } catch (_) { return match[1]; }
  }

  function removeQueryParameter(url, name) {
    var value = String(url || '');
    var hashIndex = value.indexOf('#');
    var hash = hashIndex === -1 ? '' : value.slice(hashIndex);
    var withoutHash = hashIndex === -1 ? value : value.slice(0, hashIndex);
    var queryIndex = withoutHash.indexOf('?');
    if (queryIndex === -1) return value;

    var base = withoutHash.slice(0, queryIndex);
    var pairs = withoutHash.slice(queryIndex + 1).split('&');
    var kept = [];
    for (var p = 0; p < pairs.length; p += 1) {
      if (!pairs[p]) continue;
      var rawName = pairs[p].split('=')[0];
      try { rawName = decodeURIComponent(rawName.replace(/\+/g, ' ')); } catch (_) {}
      if (rawName !== name) kept.push(pairs[p]);
    }
    return base + (kept.length ? '?' + kept.join('&') : '') + hash;
  }

  if (queryParameter('from') !== 'AppleWeatherService') {
    finishUnchanged('missing from=AppleWeatherService');
    return;
  }

  var alertSourceUrl = removeQueryParameter(removeQueryParameter(requestUrl, 'from'), 'qwa_lang');

  var APPLE_I18N = {"zh-CN":{"l":"zh-CN","t":"恶劣天气警报","p":"{n} 则极端天气警报","sl":{"extreme":"严重程度：极端","severe":"严重程度：严重","moderate":"严重程度：中等","minor":"严重程度：轻微","unknown":"严重程度：未知"},"sd":{"extreme":"异常威胁生命或财产","severe":"严重威胁生命或财产","moderate":"可能威胁生命或财产","minor":"对生命或财产几乎没有已知威胁","unknown":"这个警报的严重程度未知。"},"d":"描述","a":"受影响区域","i":"签发者","u":"上次更新日期：{date}","v":"查看警报源","fh":"天气警报不可用","fb":"恶劣天气警报可能会被取消或不再生效。","r1":"建议的行动","rp":"建议的行动"},"en-US":{"l":"en-US","t":"Severe Weather Alert","p":"{n} Severe Weather Alerts","sl":{"extreme":"Severity: <span class=\"regular\">Extreme</span>","severe":"Severity: <span class=\"regular\">Severe</span>","moderate":"Severity:<span class=\"regular\"> Moderate</span>","minor":"Severity: <span class=\"regular\">Minor</span>","unknown":"Severity: <span class=\"regular\">Unknown</span>"},"sd":{"extreme":"Extraordinary threat to life or property","severe":"Significant threat to life or property","moderate":"Possible threat to life or property","minor":"Minimal to no known threat to life or property","unknown":"The severity of this alert is not known."},"d":"Description","a":"Affected Area","i":"Issued By","u":"Last updated: {date}","v":"View Alert Source","fh":"Weather Alert Unavailable","fb":"The severe weather alert may be canceled or no longer in effect.","r1":"Action Recommended","rp":"Actions Recommended"}};

  var locale = /\/en\/severe-weather\//i.test(requestUrl) ? 'en-US' : 'zh-CN';
  var strings = APPLE_I18N[locale];
  var rtlLanguages = { ar: true, fa: true, he: true, iw: true, ur: true };
  var pageDirection = 'ltr';

  function localizedCount(value) {
    try { return Number(value).toLocaleString(strings.l || locale); }
    catch (_) { return String(value); }
  }

  function titleForCount(count) {
    if (count === 1) return strings.t;
    return String(strings.p || '{n}').replace('{n}', localizedCount(count));
  }

  function detectLanguage(text) {
    text = String(text || '');
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    if (/[\u0590-\u05ff]/.test(text)) return 'he';
    if (/[\u3040-\u30ff]/.test(text)) return 'ja';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh-CN';
    if (/[\u0400-\u04ff]/.test(text)) return 'ru';
    return locale;
  }

  function directionFor(text) {
    var detected = detectLanguage(text).split('-')[0];
    return rtlLanguages[detected] ? 'rtl' : 'ltr';
  }

  function severityFrom(className, title) {
    var source = (String(className || '') + ' ' + String(title || '')).toLowerCase();
    if (/warning--red|红色|紅色|\bred\b/.test(source)) return 'extreme';
    if (/warning--orange|橙色|\borange\b/.test(source)) return 'severe';
    if (/warning--yellow|黄色|黃色|\byellow\b/.test(source)) return 'moderate';
    if (/warning--blue|蓝色|藍色|\bblue\b/.test(source)) return 'minor';
    return 'unknown';
  }

  function extractSource(title) {
    var value = String(title || '');
    var chinese = value.match(/^(.+?(?:气象台|氣象台|气象局|氣象局))/);
    if (chinese) return chinese[1];
    var issued = value.match(/^(.+?)\s+(?:issues?|issued|发布|發佈|發布)/i);
    return issued ? issued[1] : '';
  }

  function parseDate(raw) {
    raw = String(raw || '').replace(/^Issue date:\s*/i, '').trim();
    if (!raw) return null;
    var date = new Date(raw);
    return isNaN(date.getTime()) ? null : date;
  }

  function formatDate(date) {
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat(locale, {
        month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
      }).format(date);
    } catch (_) {
      return date.toISOString();
    }
  }

  function allParagraphs(source) {
    var result = [];
    var regex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    var match;
    while ((match = regex.exec(String(source || ''))) !== null) {
      var value = decodeHtml(match[1]).replace(/^\s*\d+[.、]\s*/, '').trim();
      if (value) result.push(value);
    }
    return result;
  }

  var city = firstMatch(originalBody, /<h1[^>]*class=["'][^"']*c-submenu__location[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i, '');
  if (!city) {
    var titleText = firstMatch(originalBody, /<title>([\s\S]*?)<\/title>/i, '');
    city = titleText.replace(/\s*(?:severe weather warning|灾害预警|災害預警|天气预警|天氣預警).*$/i, '').trim();
  }
  var administration = firstMatch(originalBody, /<span[^>]*class=["'][^"']*c-submenu__location-adm[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, '');
  var affectedArea = city || administration;

  var starts = [];
  var eventStartRegex = /<div\s+class=["']c-city-warning-events\s+([^"']*)["'][^>]*>/gi;
  var startMatch;
  while ((startMatch = eventStartRegex.exec(originalBody)) !== null) {
    starts.push({ index: startMatch.index, contentStart: eventStartRegex.lastIndex, className: startMatch[1] });
  }

  var cards = [];
  for (var i = 0; i < starts.length; i += 1) {
    var end = i + 1 < starts.length ? starts[i + 1].index : originalBody.length;
    var nearby = originalBody.indexOf('<div class="c-city-warning-around">', starts[i].contentStart);
    if (nearby !== -1 && nearby < end) end = nearby;
    var block = originalBody.slice(starts[i].contentStart, end);
    var title = firstMatch(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i, '');
    var issueRaw = firstMatch(block, /<p[^>]*>\s*(Issue date:[\s\S]*?)<\/p>/i, '');
    var message = firstMatch(block, /<p[^>]*class=["'][^"']*warning-events__txt[^"']*["'][^>]*>([\s\S]*?)<\/p>/i, '');
    var standardBlock = firstMatch(block, /<div[^>]*class=["'][^"']*warning-explain[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, '');
    var standard = firstMatch(standardBlock || block, /<h4[^>]*>\s*Description\s*<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/i, '');
    var guideBlockMatch = block.match(/<div[^>]*class=["'][^"']*warning-defense__txt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    var guidelines = guideBlockMatch ? allParagraphs(guideBlockMatch[1]) : [];
    if (title || message) {
      cards.push({
        title: title || titleForCount(1),
        issue: parseDate(issueRaw),
        message: message,
        standard: standard,
        guidelines: guidelines,
        severity: severityFrom(starts[i].className, title),
        source: extractSource(title)
      });
    }
  }

  function warningSvg() {
    // Apple WarningSymbol glyph output (desiredFontSize: 34, layoutMode: glyphBox).
    return '<span class="WarningSymbol" style="height:12px" aria-hidden="true"><svg viewBox="0 0 100.5380859375 92.6259765625" version="1.1" xmlns="http://www.w3.org/2000/svg" class=" glyph-box" style="height: 44.696068px; width: 48.514005px;"><g transform="matrix(1 0 0 1 -9.9609228515626 81.54296875)"><path d="M21.875 10.8887L98.584 10.8887C105.908 10.8887 110.498 5.61523 110.498-1.02539C110.498-3.02734 110.01-5.0293 108.936-6.88477L70.5078-75.4883C68.3105-79.4434 64.2578-81.543 60.2539-81.543C56.2012-81.543 52.1484-79.4434 49.9512-75.4883L11.5723-6.83594C10.5469-4.98047 9.96094-3.02734 9.96094-1.02539C9.96094 5.61523 14.5508 10.8887 21.875 10.8887ZM60.2539-21.7285C57.7148-21.7285 56.3477-23.1934 56.2988-25.7812L55.6152-52.3438C55.5664-54.9316 57.4707-56.7871 60.2051-56.7871C62.8906-56.7871 64.8926-54.8828 64.8438-52.2949L64.1602-25.7812C64.1113-23.1445 62.6953-21.7285 60.2539-21.7285ZM60.2539-5.37109C57.373-5.37109 54.834-7.71484 54.834-10.5957C54.834-13.5254 57.3242-15.8691 60.2539-15.8691C63.2324-15.8691 65.7227-13.5742 65.7227-10.5957C65.7227-7.66602 63.1836-5.37109 60.2539-5.37109Z"></path></g></svg></span>';
  }

  function chevronSvg(direction) {
    return '<span class="ChevronSymbol chevron-' + direction + '" style="height:12px" aria-hidden="true"><svg viewBox="0 0 12 12" width="12" height="12"><path d="M2.15 4.1a.9.9 0 0 1 1.27 0L6 6.68 8.58 4.1a.9.9 0 1 1 1.27 1.27L6.64 8.58a.9.9 0 0 1-1.28 0L2.15 5.37a.9.9 0 0 1 0-1.27Z"/></svg></span>';
  }

  function contentBody(text) {
    if (!text) return '';
    var lang = detectLanguage(text);
    return '<div class="content-body" lang="' + escapeHtml(lang) + '" dir="' + directionFor(text) + '">' + escapeHtml(text).replace(/\n/g, '<br>') + '</div>';
  }

  function contentSection(title, bodies, footer, link) {
    var values = Array.isArray(bodies) ? bodies : [bodies];
    var bodyHtml = '';
    for (var j = 0; j < values.length; j += 1) bodyHtml += contentBody(values[j]);
    return '<div class="content">' +
      '<div class="content-title">' + title + '</div>' + bodyHtml +
      (footer ? '<div class="content-footer">' + escapeHtml(footer) + '</div>' : '') +
      (link ? '<div class="content-link"><a href="' + escapeHtml(link.href) + '">' + escapeHtml(link.text) + '</a></div>' : '') +
      '</div>';
  }

  function cardHtml(item, index) {
    var single = cards.length === 1;
    var expanded = single;
    var severityLabel = strings.sl[item.severity] || strings.sl.unknown;
    var severityDescription = strings.sd[item.severity] || strings.sd.unknown;
    var collapsedDirection = pageDirection === 'rtl' ? 'left' : 'right';
    var sections = '';
    sections += contentSection(severityLabel, severityDescription);
    var descriptionBodies = [];
    if (item.message) descriptionBodies.push(item.message);
    if (item.standard) descriptionBodies.push(item.standard);
    if (descriptionBodies.length) sections += contentSection(escapeHtml(strings.d), descriptionBodies);
    if (item.guidelines.length) {
      sections += contentSection(escapeHtml(item.guidelines.length === 1 ? strings.r1 : strings.rp), item.guidelines);
    }
    if (affectedArea) sections += contentSection(escapeHtml(strings.a), affectedArea);
    var updatedFooter = '';
    if (item.issue) updatedFooter = String(strings.u || '{date}').replace('{date}', formatDate(item.issue));
    sections += contentSection(
      escapeHtml(strings.i),
      item.source || administration || 'QWeather',
      updatedFooter,
      { href: alertSourceUrl, text: strings.v }
    );

    return '<div class="card ' + (expanded ? 'expanded ' : '') + (single ? 'single-event' : '') + '">' +
      '<div class="background-cover"></div>' +
      '<div class="header">' +
        '<div class="corner-cover"></div>' +
        '<div class="headline"><div class="content-title">' + escapeHtml(item.title) + '</div>' +
        '<div>' + chevronSvg(expanded ? 'down' : collapsedDirection) + '</div></div>' +
      '</div>' +
      '<div class="contents">' + sections + '</div>' +
      '<div class="footer"><div class="corner-cover"></div><div class="corners"></div></div>' +
      '</div>';
  }

  var cardsHtml = '';
  for (var c = 0; c < cards.length; c += 1) cardsHtml += cardHtml(cards[c], c);

  var bodyContent;
  if (cards.length) {
    bodyContent = '<div class="alerts-wrapper">' + warningSvg() + '<h1 class="alerts-title">' + escapeHtml(titleForCount(cards.length)) + '</h1><div class="alerts-container">' + cardsHtml + '</div></div>';
  } else {
    bodyContent = '<div class="fail-wrapper"><div class="fail-container"><h1 class="alerts-fallback-title"><b>' + escapeHtml(strings.fh) + '</b></h1><p class="alerts-fallback-body">' + escapeHtml(strings.fb) + '</p></div></div>';
  }

  var STYLE = ":root{color-scheme:light dark;--symbolCutout:#fff}*{margin:0;padding:0;box-sizing:border-box}html{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;-ms-overflow-style:-ms-autohiding-scrollbar;font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"SF Pro Icons\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif;font-size:100%;height:100%;overflow:hidden;quotes:\"“\" \"”\"}html *{font-synthesis:none;-webkit-user-select:text;-moz-user-select:text;user-select:text}body{margin:0;padding:0;font-size:13px;line-height:1.23077;font-weight:400;letter-spacing:0;color:rgba(0,0,0,.85);font-style:normal;background-color:#E5E5E5;display:flex;flex-direction:column;height:100%;overflow:hidden;-moz-font-feature-settings:'kern';-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}body:lang(th){line-height:1.72308}body:lang(ar){font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"Arabic UI Text\",\"SF Pro Icons\",\"Segoe UI\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif}[lang]:lang(ar){font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"Arabic UI Text\",\"SF Pro Icons\",\"Segoe UI\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif}[lang]:lang(he){font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"Arial Hebrew\",\"SF Pro Icons\",\"Segoe UI\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif}[lang]:lang(hi){font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"Kohinoor Devanagari\",\"SF Pro Icons\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif}[lang]:lang(ja){font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"Hiragino Sans\",\"SF Pro Icons\",\"Hiragino Kaku Gothic Pro\",\"ヒラギノ角ゴ Pro W3\",\"メイリオ\",Meiryo,\"ＭＳ Ｐゴシック\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif}[lang]:lang(ko){font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"Apple SD Gothic Neo\",\"SF Pro Icons\",\"Apple Gothic\",\"HY Gulim\",MalgunGothic,\"HY Dotum\",\"Lexi Gulim\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif;word-break:keep-all}[lang]:lang(th){font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"Thonburi Pro\",\"SF Pro Icons\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif}[lang]:lang(zh-CN){font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"PingFang SC\",\"SF Pro Icons\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif}[lang]:lang(zh-HK),[lang]:lang(zh-MO){font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"PingFang HK\",\"SF Pro Icons\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif}[lang]:lang(zh-TW){font-family:-apple-system,BlinkMacSystemFont,\"Apple Color Emoji\",\"SF Pro\",\"PingFang TC\",\"SF Pro Icons\",\"Helvetica Neue\",\"Helvetica\",\"Arial\",sans-serif}body,input,textarea,select,button{font-synthesis:none;-moz-font-feature-settings:'kern';-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}button{background:none;border:0;color:inherit;cursor:pointer;font:inherit;line-height:inherit;vertical-align:inherit}a{cursor:pointer;text-decoration:none;color:inherit;letter-spacing:inherit}a:hover{text-decoration:underline}li{list-style:none}svg{pointer-events:none}:focus{outline:2px solid #0071E3;outline-offset:0}:focus[data-focus-method=\"mouse\"]:not(input):not(textarea):not(select),:focus[data-focus-method=\"touch\"]:not(input):not(textarea):not(select){outline:none}#content-frame{width:80%;position:relative;box-sizing:border-box;color:rgba(0,0,0,.85);flex:1;margin:0 auto;max-width:800px;overflow:auto}.content-body{color:rgba(60,60,67,.6);margin:2px 0;font-size:17px}.content-body a{color:#0A84FF;text-decoration:none}.content-body a:visited,.content-body a:hover{color:#0A84FF}.content-title{color:rgba(0,0,0,.85);margin:2px 0;font-weight:600;font-size:17px;text-align:left}.content-title span.regular{font-weight:400}.rtl .content-title{text-align:right}.content-footer{color:rgba(60,60,67,.6);margin:2px 0;font-size:13px}.content-link{margin:2px 0}.content-link a{color:#0A84FF;text-decoration:none}.content-link a:visited,.content-link a:hover{color:#0A84FF}.content{display:flex;align-items:flex-start;flex-direction:column;text-align:left;padding:17px 0;overflow-wrap:anywhere}.rtl .content{text-align:right;direction:rtl}.ChevronSymbol svg{fill:rgba(60,60,67,.3);transition:all .35s ease}.ChevronSymbol.chevron-up svg{transform:rotate(180deg)}.ChevronSymbol.chevron-right svg{transform:rotate(-90deg)}.ChevronSymbol.chevron-left svg{transform:rotate(90deg)}.header{position:sticky;cursor:pointer;top:20px;margin:0 -20px;padding:0 20px;transform:translate3d(0,0,0);border-bottom:.5px solid rgba(0,0,0,.1)}.header .corner-cover{top:0;margin:0 -20px}.header .headline{margin:0 -20px;padding:20px;min-height:56px;border-radius:10px;background:#fff;position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;color:rgba(0,0,0,.85)}.card{z-index:0;background-color:#fff;border-radius:10px;margin:10px 0;margin-top:-10px;padding:0 20px;position:relative}.card .contents{max-height:0;transition:max-height .4s ease-in-out;overflow:hidden}.card.expanded .contents{transition:max-height .4s ease-in-out}.corner-cover{background:#E5E5E5;z-index:1;height:10px;width:100%;display:block;position:absolute}.background-cover{height:20px;background:#E5E5E5;position:sticky;top:0;margin:0 -20px}.footer{position:absolute;width:100%;bottom:0;pointer-events:none;transform:translate3d(0,0,0);margin:0 -20px}.footer .corner-cover{bottom:0}.footer .corners{height:10px;background:#fff;z-index:2;border-radius:0 0 10px 10px;position:relative;width:100%}.contents :not(:last-child).content{border-bottom:.5px solid rgba(0,0,0,.1)}html,body,#content-frame,.fail-wrapper{height:100%}.fail-wrapper{margin:0 16px}.fail-container{height:100%;display:flex;flex-direction:column;justify-content:center;max-width:500px;text-align:center;margin:0 auto}.alerts-fallback-title{color:rgba(0,0,0,.85);font-size:20px;line-height:25px;margin:0 0 4px}.alerts-fallback-body{color:rgba(60,60,67,.6);font-size:15px;line-height:20px}.alerts-wrapper{margin:30px 16px;padding:0 0 30px;text-align:center}.alerts-wrapper .WarningSymbol svg{margin:0 0 10px;fill:rgba(0,0,0,.85);overflow:visible}.alerts-container{margin:20px 0 16px}.alerts-title{font-weight:600;font-size:20px;line-height:25px;color:rgba(0,0,0,.85)}@media screen and (inverted-colors:inverted){body,#content-frame{filter:invert(100%)}}@media(min-width:319px){.content{font-size:16px}}@media(max-width:541px){body{background-color:#F2F1F5}#content-frame{width:100%}.alerts-wrapper{margin:20px 16px}.alerts-wrapper .WarningSymbol svg{margin:0 0 8px;fill:#000}.alerts-title{color:#000}.card{padding:0 16px}.corner-cover{background:#F2F1F5}.background-cover{margin:0 -16px;background:#F2F1F5}.header{margin:0 -16px;padding:0 16px;border-bottom:.5px solid rgba(60,60,67,.3)}.header .corner-cover{margin:0 -16px}.header .headline{margin:0 -16px;padding:16px;min-height:60px}.contents :not(:last-child).content{border-bottom:.5px solid rgba(60,60,67,.3)}.content-title{color:#000}.footer{margin:0 -16px}}@media(max-width:319px){body *{-webkit-text-size-adjust:none;-moz-text-size-adjust:none;text-size-adjust:none}.content-body,.content-title{font-size:16px}.header{position:relative;top:0;cursor:default}.header .headline>div:last-child{display:none}.card .contents{max-height:100%}.alerts-wrapper{margin:30px 5px}.alerts-title{font-size:19px}}@media(prefers-color-scheme:dark){:root{--symbolCutout:#1C1C1E}body{color:#fff;background-color:#1C1C1E}.content-body,.content-footer,.alerts-fallback-body{color:rgba(235,235,245,.6)}.content-title,.alerts-fallback-title{color:#fff}.ChevronSymbol svg{fill:rgba(235,235,245,.3)}.header{border-bottom:.5px solid rgba(235,235,245,.3)}.header .headline,.card,.footer .corners{background:#2C2C2E}.corner-cover,.background-cover{background:#1C1C1E}.contents :not(:last-child).content{border-bottom:.5px solid rgba(235,235,245,.3)}.alerts-wrapper .WarningSymbol svg{fill:#fff}.alerts-title{color:#fff}}";

  var INTERACTION = "(function(){var cards=document.querySelectorAll('.card');function easeInOut(e){return e<.5?2*e*e:(4-2*e)*e-1}function scrollByApple(distance,duration){var start=Date.now(),moved=0;function step(){var elapsed=Date.now(),progress=Math.min(1,(elapsed-start)/duration),next=easeInOut(progress)*distance,delta=next-moved;window.scrollBy(0,delta);moved+=delta;if(progress<1)requestAnimationFrame(step)}requestAnimationFrame(step)}function setChevron(card,expanded){var symbol=card.querySelector('.ChevronSymbol');if(!symbol)return;symbol.classList.remove('chevron-up','chevron-down','chevron-left','chevron-right');symbol.classList.add(expanded?'chevron-down':(document.documentElement.dir==='rtl'?'chevron-left':'chevron-right'))}function resizeExpandedCards(){for(var i=0;i<cards.length;i++){var card=cards[i],contents=card.querySelector('.contents');if(window.outerWidth<320){contents.style.maxHeight='';continue}if(card.classList.contains('expanded'))contents.style.maxHeight=contents.scrollHeight+'px'}}for(var i=0;i<cards.length;i++){(function(card){var contents=card.querySelector('.contents'),header=card.querySelector('.header');if(card.classList.contains('single-event')){contents.style.maxHeight='9999px';contents.style.maxHeight=card.scrollHeight+'px'}header.addEventListener('click',function(){if(window.outerWidth<320)return;var expanded=card.classList.contains('expanded'),cardTop=card.getBoundingClientRect().top,headerTop=header.getBoundingClientRect().top;contents.style.maxHeight=expanded?'0px':contents.scrollHeight+'px';if(expanded)card.classList.remove('expanded');else card.classList.add('expanded');if((cardTop<0&&headerTop>=0)||(cardTop<0&&!expanded))scrollByApple(cardTop,400);if(cardTop<0&&headerTop<0)scrollByApple(cardTop-headerTop+20,400);setChevron(card,!expanded)})})(cards[i])}window.addEventListener('resize',resizeExpandedCards)})();";

  var output = '<!doctype html><html lang="' + escapeHtml(locale) + '" dir="' + pageDirection + '" class="' + pageDirection + '"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<meta name="disabled-adaptations" content="watch"><meta name="color-scheme" content="light dark">' +
    '<title>' + escapeHtml(cards.length ? titleForCount(cards.length) : strings.fh) + '</title>' +
    '<style>' + STYLE + '</style></head><body><div id="content-frame">' + bodyContent + '</div>' +
    (cards.length ? '<script>' + INTERACTION + '<\/script>' : '') + '</body></html>';

  var headers = {};
  var originalHeaders = $response.headers || {};
  Object.keys(originalHeaders).forEach(function (key) {
    var lower = key.toLowerCase();
    if (lower !== 'content-encoding' && lower !== 'content-length' && lower !== 'transfer-encoding' &&
        lower !== 'content-type' && lower !== 'content-security-policy' && lower !== 'content-security-policy-report-only' &&
        lower !== 'x-content-security-policy' && lower !== 'etag' && lower !== 'last-modified' &&
        lower !== 'cache-control' && lower !== 'expires' && lower !== 'pragma') {
      headers[key] = originalHeaders[key];
    }
  });
  headers['Content-Type'] = 'text/html; charset=utf-8';
  headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
  headers['Pragma'] = 'no-cache';
  headers['Expires'] = '0';
  headers['X-QWeather-Apple-Style'] = 'active-v8-apple-glyph-foldable-single';

  if (typeof console !== 'undefined' && console.log) {
    console.log('[QWeather Apple] rendered ' + cards.length + ' alert(s), locale=' + locale + ', bytes=' + output.length);
  }

  // Correct Surge http-response return shape: body/headers/status at top level.
  $done({
    status: $response.status || 200,
    headers: headers,
    body: output
  });
})();

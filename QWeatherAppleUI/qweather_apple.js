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

  function normalizeLocale(locale) {
    locale = String(locale || '').replace(/_/g, '-').trim();
    if (!locale) return 'en-US';
    var lower = locale.toLowerCase();
    var aliases = {
      'zh': 'zh-CN', 'zh-cn': 'zh-CN', 'zh-hans': 'zh-CN', 'zh-sg': 'zh-CN',
      'zh-hk': 'zh-HK', 'zh-mo': 'zh-HK', 'zh-hant': 'zh-TW', 'zh-tw': 'zh-TW',
      'en': 'en-US', 'en-us': 'en-US', 'en-gb': 'en-GB', 'en-au': 'en-AU',
      'ja': 'ja-JP', 'jp': 'ja-JP', 'ko': 'ko-KR',
      'ar': 'ar-SA', 'he': 'he-IL', 'iw': 'he-IL',
      'pt': 'pt-PT', 'pt-br': 'pt-BR',
      'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT',
      'ru': 'ru-RU', 'uk': 'uk-UA', 'th': 'th-TH', 'vi': 'vi-VN',
      'id': 'id-ID', 'in': 'id-ID', 'ms': 'ms-MY', 'nl': 'nl-NL',
      'pl': 'pl-PL', 'tr': 'tr-TR', 'hi': 'hi-IN'
    };
    if (aliases[lower]) return aliases[lower];
    var parts = lower.split('-');
    if (aliases[parts[0]]) return aliases[parts[0]];
    return locale;
  }

  var pageLocale = firstMatch(originalBody, /<html[^>]*\blang=["']([^"']+)["']/i, 'en-US');
  var locale = normalizeLocale(queryParameter('qwa_lang') || pageLocale);
  var language = locale.split('-')[0].toLowerCase();
  var rtlLanguages = { ar: true, fa: true, he: true, iw: true, ur: true };
  var pageDirection = rtlLanguages[language] ? 'rtl' : 'ltr';

  var STRINGS = {
    'en': {
      plural: function (n) { return n + (n === 1 ? ' Severe Weather Alert' : ' Severe Weather Alerts'); },
      unavailableTitle: 'Weather Alert Unavailable', unavailableBody: 'The severe weather alert may be cancelled or no longer in effect.',
      severity: 'Severity', levels: { extreme: 'Extreme', severe: 'Severe', moderate: 'Moderate', minor: 'Minor', unknown: 'Unknown' },
      levelDescriptions: { extreme: 'Extraordinary threat to life or property', severe: 'Significant threat to life or property', moderate: 'Possible threat to life or property', minor: 'Minimal to no known threat to life or property', unknown: 'The severity of this alert is not known.' },
      description: 'Description', standard: 'Description', guidelines: 'Guidelines', affectedArea: 'Affected Area', issuedBy: 'Issued By', lastUpdated: 'Last updated', source: 'View Alert Source'
    },
    'zh-CN': {
      plural: function (n) { return n + ' 个恶劣天气警报'; }, unavailableTitle: '天气警报不可用', unavailableBody: '恶劣天气警报可能已取消或不再生效。',
      severity: '严重程度', levels: { extreme: '极端', severe: '严重', moderate: '中等', minor: '轻微', unknown: '未知' },
      levelDescriptions: { extreme: '异常威胁生命或财产', severe: '严重威胁生命或财产', moderate: '可能威胁生命或财产', minor: '对生命或财产几乎没有已知威胁', unknown: '这个警报的严重程度未知。' },
      description: '描述', standard: '预警标准', guidelines: '防御指南', affectedArea: '受影响区域', issuedBy: '签发者', lastUpdated: '上次更新', source: '查看警报源'
    },
    'zh-HK': {
      plural: function (n) { return n + ' 個惡劣天氣警報'; }, unavailableTitle: '沒有提供天氣警示', unavailableBody: '惡劣天氣警示可能已取消或不再生效。',
      severity: '嚴重程度', levels: { extreme: '極端', severe: '嚴重', moderate: '中度', minor: '輕度', unknown: '不詳' },
      levelDescriptions: { extreme: '對生命或財產有巨大威脅', severe: '對生命或財產有重大威脅', moderate: '可能對生命或財產有威脅', minor: '對生命或財產有極小至沒有已知威脅', unknown: '此警示的嚴重程度不詳。' },
      description: '描述', standard: '警示標準', guidelines: '防禦指南', affectedArea: '受影響區域', issuedBy: '簽發人', lastUpdated: '上次更新', source: '查看警示來源'
    },
    'zh-TW': {
      plural: function (n) { return n + ' 個惡劣天氣警報'; }, unavailableTitle: '天氣警示無法使用', unavailableBody: '惡劣天氣警示可能已取消或不再生效。',
      severity: '嚴重程度', levels: { extreme: '極端', severe: '劇烈', moderate: '中等', minor: '輕度', unknown: '未知' },
      levelDescriptions: { extreme: '對生命財產造成異常威脅', severe: '對生命財產造成顯著威脅', moderate: '對生命財產可能有威脅', minor: '對生命財產的威脅極小或沒有已知威脅', unknown: '此次警示的嚴重程度未知。' },
      description: '說明', standard: '警示標準', guidelines: '防禦指南', affectedArea: '受影響的區域', issuedBy: '發布者', lastUpdated: '上次更新', source: '查看警示來源'
    },
    'ja': {
      plural: function (n) { return '重大な気象警報 ' + n + '件'; }, unavailableTitle: '気象警報を利用できません', unavailableBody: '重大な気象警報は解除されたか、有効でなくなった可能性があります。',
      severity: '重大度', levels: { extreme: '極端', severe: '重大', moderate: '中程度', minor: '軽度', unknown: '不明' },
      levelDescriptions: { extreme: '生命または財産に対する異常な脅威', severe: '生命または財産に対する重大な脅威', moderate: '生命または財産に対する可能性のある脅威', minor: '生命または財産に対する既知の脅威は最小限です', unknown: 'この警報の重大度は不明です。' },
      description: '説明', standard: '警報基準', guidelines: '推奨される行動', affectedArea: '影響を受ける地域', issuedBy: '発表元', lastUpdated: '最終更新', source: '警報の情報源を表示'
    },
    'ko': {
      plural: function (n) { return '기상 특보 ' + n + '건'; }, unavailableTitle: '기상 특보를 사용할 수 없음', unavailableBody: '기상 특보가 취소되었거나 더 이상 유효하지 않을 수 있습니다.',
      severity: '심각도', levels: { extreme: '극심', severe: '심각', moderate: '보통', minor: '낮음', unknown: '알 수 없음' },
      levelDescriptions: { extreme: '생명 또는 재산에 대한 이례적인 위협', severe: '생명 또는 재산에 대한 중대한 위협', moderate: '생명 또는 재산에 대한 잠재적 위협', minor: '생명 또는 재산에 알려진 위협이 거의 없음', unknown: '이 특보의 심각도는 알려져 있지 않습니다.' },
      description: '설명', standard: '특보 기준', guidelines: '권장 조치', affectedArea: '영향 지역', issuedBy: '발표 기관', lastUpdated: '마지막 업데이트', source: '특보 출처 보기'
    },
    'fr': {
      plural: function (n) { return n + (n === 1 ? ' alerte météo importante' : ' alertes météo importantes'); }, unavailableTitle: 'Alerte météo indisponible', unavailableBody: 'L’alerte météo peut avoir été annulée ou ne plus être en vigueur.',
      severity: 'Gravité', levels: { extreme: 'Extrême', severe: 'Importante', moderate: 'Modérée', minor: 'Faible', unknown: 'Inconnue' },
      levelDescriptions: { extreme: 'Menace extraordinaire pour la vie ou les biens', severe: 'Menace importante pour la vie ou les biens', moderate: 'Menace potentielle pour la vie ou les biens', minor: 'Menace faible ou nulle pour la vie ou les biens', unknown: 'La gravité de cette alerte est inconnue.' },
      description: 'Description', standard: 'Critères de l’alerte', guidelines: 'Actions recommandées', affectedArea: 'Zone concernée', issuedBy: 'Publié par', lastUpdated: 'Dernière mise à jour', source: 'Afficher la source de l’alerte'
    },
    'de': {
      plural: function (n) { return n + (n === 1 ? ' Unwetterwarnung' : ' Unwetterwarnungen'); }, unavailableTitle: 'Wetterwarnung nicht verfügbar', unavailableBody: 'Die Unwetterwarnung wurde möglicherweise aufgehoben oder ist nicht mehr gültig.',
      severity: 'Alarmstufe', levels: { extreme: 'Extrem', severe: 'Hoch', moderate: 'Mittel', minor: 'Niedrig', unknown: 'Unbekannt' },
      levelDescriptions: { extreme: 'Außergewöhnliche Bedrohung für Leben oder Besitz', severe: 'Deutliche Bedrohung für Leben oder Besitz', moderate: 'Mögliche Bedrohung für Leben oder Besitz', minor: 'Niedrige oder keine bekannte Bedrohung für Leben oder Besitz', unknown: 'Die Alarmstufe ist nicht bekannt.' },
      description: 'Beschreibung', standard: 'Warnkriterien', guidelines: 'Empfohlene Maßnahmen', affectedArea: 'Betroffene Gegend', issuedBy: 'Herausgegeben von', lastUpdated: 'Letzte Aktualisierung', source: 'Warnungsquelle anzeigen'
    },
    'es': {
      plural: function (n) { return n + (n === 1 ? ' alerta de clima severo' : ' alertas de clima severo'); }, unavailableTitle: 'Alerta meteorológica no disponible', unavailableBody: 'La alerta podría haberse cancelado o ya no estar vigente.',
      severity: 'Gravedad', levels: { extreme: 'Extrema', severe: 'Alta', moderate: 'Moderada', minor: 'Baja', unknown: 'Desconocida' },
      levelDescriptions: { extreme: 'Amenaza extraordinaria para la vida o la propiedad', severe: 'Amenaza significativa para la vida o la propiedad', moderate: 'Posible amenaza para la vida o la propiedad', minor: 'Amenaza mínima o desconocida para la vida o la propiedad', unknown: 'Se desconoce la gravedad de esta alerta.' },
      description: 'Descripción', standard: 'Criterios de alerta', guidelines: 'Acciones recomendadas', affectedArea: 'Área afectada', issuedBy: 'Emitida por', lastUpdated: 'Última actualización', source: 'Ver fuente de alerta'
    },
    'it': {
      plural: function (n) { return n + (n === 1 ? ' avviso di condizioni meteo avverse' : ' avvisi di condizioni meteo avverse'); }, unavailableTitle: 'Avviso meteo non disponibile', unavailableBody: 'L’avviso può essere stato annullato o non essere più in vigore.',
      severity: 'Gravità', levels: { extreme: 'Estrema', severe: 'Elevata', moderate: 'Moderata', minor: 'Bassa', unknown: 'Sconosciuta' },
      levelDescriptions: { extreme: 'Minaccia straordinaria per la vita o i beni', severe: 'Minaccia significativa per la vita o i beni', moderate: 'Possibile minaccia per la vita o i beni', minor: 'Minaccia minima o non nota per la vita o i beni', unknown: 'La gravità di questo avviso non è nota.' },
      description: 'Descrizione', standard: 'Criteri dell’avviso', guidelines: 'Azioni consigliate', affectedArea: 'Area interessata', issuedBy: 'Emesso da', lastUpdated: 'Ultimo aggiornamento', source: 'Mostra fonte dell’avviso'
    },
    'pt': {
      plural: function (n) { return n + (n === 1 ? ' alerta meteorológico' : ' alertas meteorológicos'); }, unavailableTitle: 'Alerta meteorológico indisponível', unavailableBody: 'O alerta pode ter sido cancelado ou já não estar em vigor.',
      severity: 'Gravidade', levels: { extreme: 'Extrema', severe: 'Grave', moderate: 'Moderada', minor: 'Baixa', unknown: 'Desconhecida' },
      levelDescriptions: { extreme: 'Ameaça extraordinária à vida ou à propriedade', severe: 'Ameaça significativa à vida ou à propriedade', moderate: 'Possível ameaça à vida ou à propriedade', minor: 'Ameaça mínima ou desconhecida à vida ou à propriedade', unknown: 'A gravidade deste alerta é desconhecida.' },
      description: 'Descrição', standard: 'Critérios do alerta', guidelines: 'Ações recomendadas', affectedArea: 'Área afetada', issuedBy: 'Emitido por', lastUpdated: 'Última atualização', source: 'Ver fonte do alerta'
    },
    'ru': {
      plural: function (n) { return 'Оповещения об экстремальных погодных условиях: ' + n; }, unavailableTitle: 'Оповещение о погоде недоступно', unavailableBody: 'Оповещение могло быть отменено или больше не действует.',
      severity: 'Степень серьезности', levels: { extreme: 'Экстремальная', severe: 'Высокая', moderate: 'Умеренная', minor: 'Незначительная', unknown: 'Неизвестна' },
      levelDescriptions: { extreme: 'Чрезвычайная угроза жизни или имуществу', severe: 'Значительная угроза жизни или имуществу', moderate: 'Возможная угроза жизни или имуществу', minor: 'Минимальная или неизвестная угроза жизни или имуществу', unknown: 'Степень серьезности неизвестна.' },
      description: 'Описание', standard: 'Критерии предупреждения', guidelines: 'Рекомендуемые действия', affectedArea: 'Затронутая область', issuedBy: 'Выпущено', lastUpdated: 'Последнее обновление', source: 'Показать источник'
    },
    'ar': {
      plural: function (n) { return n + ' تنبيهات بخصوص طقس عاصف'; }, unavailableTitle: 'تنبيه الطقس غير متوفر', unavailableBody: 'قد يكون تنبيه الطقس قد أُلغي أو لم يعد ساريًا.',
      severity: 'درجة الخطورة', levels: { extreme: 'بالغة', severe: 'شديدة', moderate: 'متوسطة', minor: 'طفيفة', unknown: 'غير معروفة' },
      levelDescriptions: { extreme: 'تهديد غير عادي للأرواح أو الممتلكات', severe: 'تهديد كبير للأرواح أو الممتلكات', moderate: 'تهديد محتمل للأرواح أو الممتلكات', minor: 'تهديد ضئيل أو غير معروف للأرواح أو الممتلكات', unknown: 'خطورة هذا التنبيه غير معروفة.' },
      description: 'الوصف', standard: 'معايير التنبيه', guidelines: 'الإجراءات الموصى بها', affectedArea: 'المنطقة المتأثرة', issuedBy: 'صادر عن', lastUpdated: 'آخر تحديث', source: 'عرض مصدر التنبيه'
    },
    'he': {
      plural: function (n) { return n + ' התראות על מזג אוויר קשה'; }, unavailableTitle: 'התראת מזג אוויר אינה זמינה', unavailableBody: 'ייתכן שההתראה בוטלה או אינה בתוקף עוד.',
      severity: 'חומרה', levels: { extreme: 'קיצונית', severe: 'חמורה', moderate: 'בינונית', minor: 'שולית', unknown: 'לא ידועה' },
      levelDescriptions: { extreme: 'סכנה רצינית במיוחד לחיים או לרכוש', severe: 'סכנה רצינית לחיים או לרכוש', moderate: 'סכנה אפשרית לחיים או לרכוש', minor: 'סכנה מזערית או לא ידועה לחיים או לרכוש', unknown: 'רמת החומרה אינה ידועה.' },
      description: 'תיאור', standard: 'קריטריונים להתראה', guidelines: 'פעולות מומלצות', affectedArea: 'האזור המושפע', issuedBy: 'פורסם על ידי', lastUpdated: 'עדכון אחרון', source: 'הצגת מקור ההתראה'
    }
  };

  function getStrings() {
    if (STRINGS[locale]) return STRINGS[locale];
    if (STRINGS[language]) return STRINGS[language];
    return STRINGS.en;
  }

  var strings = getStrings();

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
        title: title || strings.plural(1),
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
    return '<span class="WarningSymbol" aria-hidden="true"><svg viewBox="0 0 34 34" width="34" height="34"><path d="M15.156 3.72 1.36 27.56C.41 29.2 1.59 31.25 3.49 31.25h27.02c1.9 0 3.08-2.05 2.13-3.69L18.844 3.72a2.13 2.13 0 0 0-3.688 0Z"/><path d="M17 10.1c1.05 0 1.82.82 1.76 1.87l-.62 8.68a1.14 1.14 0 0 1-2.28 0l-.62-8.68A1.76 1.76 0 0 1 17 10.1Zm0 15.22a1.73 1.73 0 1 1 0 3.46 1.73 1.73 0 0 1 0-3.46Z" fill="var(--symbolCutout)"/></svg></span>';
  }

  function chevronSvg(direction) {
    return '<span class="ChevronSymbol chevron-' + direction + '" aria-hidden="true"><svg viewBox="0 0 12 12" width="12" height="12"><path d="M2.15 4.1a.9.9 0 0 1 1.27 0L6 6.68 8.58 4.1a.9.9 0 1 1 1.27 1.27L6.64 8.58a.9.9 0 0 1-1.28 0L2.15 5.37a.9.9 0 0 1 0-1.27Z"/></svg></span>';
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
    var severityLabel = strings.levels[item.severity] || strings.levels.unknown;
    var severityDescription = strings.levelDescriptions[item.severity] || strings.levelDescriptions.unknown;
    var collapsedDirection = pageDirection === 'rtl' ? 'left' : 'right';
    var sections = '';
    sections += contentSection(escapeHtml(strings.severity) + ': <span class="regular">' + escapeHtml(severityLabel) + '</span>', severityDescription);
    if (item.message) sections += contentSection(escapeHtml(strings.description), item.message);
    if (item.standard) sections += contentSection(escapeHtml(strings.standard), item.standard);
    if (item.guidelines.length) sections += contentSection(escapeHtml(strings.guidelines), item.guidelines);
    if (affectedArea) sections += contentSection(escapeHtml(strings.affectedArea), affectedArea);
    sections += contentSection(
      escapeHtml(strings.issuedBy),
      item.source || administration || 'QWeather',
      item.issue ? strings.lastUpdated + ': ' + formatDate(item.issue) : '',
      { href: requestUrl, text: strings.source }
    );

    return '<article class="card' + (expanded ? ' expanded single-event' : '') + '" data-alert-index="' + index + '" data-default-expanded="' + (expanded ? 'true' : 'false') + '">' +
      '<div class="background-cover"></div>' +
      '<div class="header"' + (single ? '' : ' role="button" tabindex="0"') + ' aria-expanded="' + (expanded ? 'true' : 'false') + '" aria-controls="alert-contents-' + index + '">' +
        '<div class="corner-cover"></div>' +
        '<div class="headline"><div class="content-title" lang="' + escapeHtml(detectLanguage(item.title)) + '">' + escapeHtml(item.title) + '</div>' +
        (single ? '' : '<div class="chevron-holder">' + chevronSvg(expanded ? 'down' : collapsedDirection) + '</div>') + '</div>' +
      '</div>' +
      '<div class="contents" id="alert-contents-' + index + '">' + sections + '</div>' +
      '<div class="footer"><div class="corner-cover"></div><div class="corners"></div></div>' +
      '</article>';
  }

  var cardsHtml = '';
  for (var c = 0; c < cards.length; c += 1) cardsHtml += cardHtml(cards[c], c);

  var bodyContent;
  if (cards.length) {
    bodyContent = '<div class="alerts-wrapper">' + warningSvg() + '<h1 class="alerts-title">' + escapeHtml(strings.plural(cards.length)) + '</h1><div class="alerts-container">' + cardsHtml + '</div></div>';
  } else {
    bodyContent = '<div class="fail-wrapper"><div class="fail-container"><h1 class="alerts-fallback-title">' + escapeHtml(strings.unavailableTitle) + '</h1><p class="alerts-fallback-body">' + escapeHtml(strings.unavailableBody) + '</p></div></div>';
  }

  var STYLE = ':root{color-scheme:light dark;--systemPrimary:rgba(0,0,0,.85);--systemSecondaryIOS:rgba(60,60,67,.6);--systemTertiaryIOS:rgba(60,60,67,.3);--pageBackground:#E5E5E5;--pageBackgroundIOS:#F2F1F5;--cardBackground:#fff;--separator:rgba(0,0,0,.1);--separatorIOS:rgba(60,60,67,.3);--linkColor:#0A84FF;--symbolCutout:#fff}*{box-sizing:border-box;margin:0;padding:0}html{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;height:100%;overflow:hidden}html *{font-synthesis:none}body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Apple Color Emoji","SF Pro","SF Pro Icons","Helvetica Neue",Helvetica,Arial,sans-serif;font-size:13px;line-height:1.23077;font-weight:400;color:var(--systemPrimary);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;background-color:var(--pageBackground);display:flex;flex-direction:column;height:100%;overflow:hidden}[lang]:lang(ar){font-family:-apple-system,BlinkMacSystemFont,"Apple Color Emoji","SF Pro","Arabic UI Text","SF Pro Icons","Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif}[lang]:lang(he){font-family:-apple-system,BlinkMacSystemFont,"Apple Color Emoji","SF Pro","Arial Hebrew","SF Pro Icons","Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif}[lang]:lang(ja){font-family:-apple-system,BlinkMacSystemFont,"Apple Color Emoji","SF Pro","Hiragino Sans","SF Pro Icons","Hiragino Kaku Gothic Pro",Meiryo,"Helvetica Neue",Helvetica,Arial,sans-serif}[lang]:lang(ko){font-family:-apple-system,BlinkMacSystemFont,"Apple Color Emoji","SF Pro","Apple SD Gothic Neo","SF Pro Icons",MalgunGothic,"Helvetica Neue",Helvetica,Arial,sans-serif;word-break:keep-all}[lang]:lang(zh-CN){font-family:-apple-system,BlinkMacSystemFont,"Apple Color Emoji","SF Pro","PingFang SC","SF Pro Icons","Helvetica Neue",Helvetica,Arial,sans-serif}[lang]:lang(zh-HK){font-family:-apple-system,BlinkMacSystemFont,"Apple Color Emoji","SF Pro","PingFang HK","SF Pro Icons","Helvetica Neue",Helvetica,Arial,sans-serif}[lang]:lang(zh-TW){font-family:-apple-system,BlinkMacSystemFont,"Apple Color Emoji","SF Pro","PingFang TC","SF Pro Icons","Helvetica Neue",Helvetica,Arial,sans-serif}button,input,textarea,select{font:inherit}a{cursor:pointer;text-decoration:none;color:inherit}a:hover{text-decoration:underline}ul,ol,li{list-style:none}svg{pointer-events:none}:focus{outline:2px solid #0071E3;outline-offset:0}:focus:not(:focus-visible){outline:none}#content-frame{position:relative;box-sizing:border-box;color:var(--systemPrimary);flex:1;margin:0 auto;max-width:800px;overflow:auto;width:80%;-webkit-overflow-scrolling:touch}.alerts-wrapper{margin:30px 16px;padding:0 0 30px;text-align:center}.alerts-wrapper .WarningSymbol{display:inline-block;height:34px}.alerts-wrapper .WarningSymbol svg{display:block;margin:0 0 10px;fill:var(--systemPrimary);overflow:visible}.alerts-title{font-weight:600;font-size:20px;line-height:25px;color:var(--systemPrimary)}.alerts-container{margin:20px 0 16px}.card{z-index:0;background-color:var(--cardBackground);border-radius:10px;margin:10px 0;margin-top:-10px;padding:0 20px;position:relative;text-align:left}.rtl .card{text-align:right}.card .contents{max-height:0;transition:max-height .4s ease-in-out;overflow:hidden}.background-cover{height:20px;background:var(--pageBackground);position:sticky;top:0;margin:0 -20px;z-index:1}.corner-cover{background:var(--pageBackground);z-index:1;height:10px;width:100%;display:block;position:absolute}.header{position:sticky;cursor:pointer;top:20px;margin:0 -20px;padding:0 20px;transform:translate3d(0,0,0);border-bottom:0 solid transparent;z-index:3}.card.expanded .header{border-bottom:.5px solid var(--separator)}.header .corner-cover{top:0;margin:0 -20px}.header .headline{margin:0 -20px;padding:20px;min-height:56px;border-radius:10px;background:var(--cardBackground);position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;color:var(--systemPrimary);gap:14px}.single-event .header{cursor:default}.headline>.content-title{min-width:0}.chevron-holder{flex:0 0 auto;display:flex;align-items:center}.ChevronSymbol{display:inline-flex;height:12px}.ChevronSymbol svg{fill:var(--systemTertiaryIOS);transition:all .35s ease}.ChevronSymbol.chevron-right svg{transform:rotate(-90deg)}.ChevronSymbol.chevron-left svg{transform:rotate(90deg)}.ChevronSymbol.chevron-up svg{transform:rotate(180deg)}.content{display:flex;align-items:flex-start;flex-direction:column;text-align:left;padding:17px 0;overflow-wrap:anywhere}.rtl .content{align-items:flex-end;text-align:right;direction:rtl}.contents :not(:last-child).content{border-bottom:.5px solid var(--separator)}.content-title{color:var(--systemPrimary);margin:2px 0;font-weight:600;font-size:17px;text-align:left}.rtl .content-title{text-align:right}.content-title span.regular{font-weight:400}.content-body{color:var(--systemSecondaryIOS);margin:2px 0;font-size:17px}.content-body[dir="rtl"]{text-align:right;align-self:stretch}.content-body[dir="ltr"]{text-align:left;align-self:stretch}.content-footer{color:var(--systemSecondaryIOS);margin:2px 0;font-size:13px}.content-link{margin:2px 0}.content-link a{color:var(--linkColor);text-decoration:none}.content-link a:hover{text-decoration:underline}.footer{position:absolute;width:100%;bottom:0;pointer-events:none;transform:translate3d(0,0,0);margin:0 -20px}.footer .corner-cover{bottom:0}.footer .corners{height:10px;background:var(--cardBackground);z-index:2;border-radius:0 0 10px 10px;position:relative;width:100%}.fail-wrapper{height:100%;margin:0 16px}.fail-container{height:100%;display:flex;flex-direction:column;justify-content:center;max-width:500px;text-align:center;margin:0 auto}.alerts-fallback-title{color:var(--systemPrimary);font-size:20px;line-height:25px;margin:0 0 4px}.alerts-fallback-body{color:var(--systemSecondaryIOS);font-size:15px;line-height:20px}@media screen and (inverted-colors:inverted){body,#content-frame{filter:invert(100%)}}@media(max-width:541px){body{background-color:var(--pageBackgroundIOS)}#content-frame{width:100%}.alerts-wrapper{margin:20px 16px}.alerts-wrapper .WarningSymbol svg{margin-bottom:8px;fill:#000}.alerts-title{color:#000}.card{padding:0 16px}.background-cover{margin:0 -16px;background:var(--pageBackgroundIOS)}.corner-cover{background:var(--pageBackgroundIOS)}.header{margin:0 -16px;padding:0 16px}.card.expanded .header{border-bottom-color:var(--separatorIOS)}.header .corner-cover{margin:0 -16px}.header .headline{margin:0 -16px;padding:16px;min-height:60px}.contents :not(:last-child).content{border-bottom-color:var(--separatorIOS)}.content-title{color:#000}.footer{margin:0 -16px}}@media(max-width:319px){body *{-webkit-text-size-adjust:none;-moz-text-size-adjust:none;text-size-adjust:none}.alerts-wrapper{margin:30px 5px}.alerts-title{font-size:19px}.header{position:relative;top:0;cursor:default}.card .contents{max-height:100%}.chevron-holder{display:none}.content-title,.content-body{font-size:16px}}@media(prefers-color-scheme:dark){:root{--systemPrimary:#fff;--systemSecondaryIOS:rgba(235,235,245,.6);--systemTertiaryIOS:rgba(235,235,245,.3);--pageBackground:#1C1C1E;--pageBackgroundIOS:#1C1C1E;--cardBackground:#2C2C2E;--separator:rgba(235,235,245,.3);--separatorIOS:rgba(235,235,245,.3);--symbolCutout:#1C1C1E}body{background-color:#1C1C1E}.alerts-wrapper .WarningSymbol svg{fill:#fff}.alerts-title,.content-title,.alerts-fallback-title{color:#fff}.card,.header .headline,.footer .corners{background-color:#2C2C2E}.background-cover,.corner-cover{background:#1C1C1E}.content-body,.content-footer,.alerts-fallback-body{color:rgba(235,235,245,.6)}}@media(prefers-reduced-motion:reduce){.card .contents,.ChevronSymbol svg{transition:none!important}}';

  var INTERACTION = '(function(){var frame=document.getElementById("content-frame");var cards=document.querySelectorAll(".card");var multi=document.querySelectorAll(".card:not(.single-event)");var compact=null;function reducedMotion(){return window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}function smoothBy(distance,duration){if(!distance)return;if(reducedMotion()){frame.scrollTop+=distance;return}var start=Date.now(),moved=0;function ease(x){return x<.5?2*x*x:(4-2*x)*x-1}function step(){var progress=Math.min(1,(Date.now()-start)/duration),next=ease(progress)*distance,delta=next-moved;frame.scrollTop+=delta;moved=next;if(progress<1)requestAnimationFrame(step)}requestAnimationFrame(step)}function chevron(card,open){var icon=card.querySelector(".ChevronSymbol");if(!icon)return;icon.classList.remove("chevron-left","chevron-right","chevron-down","chevron-up");icon.classList.add(open?"chevron-down":(document.documentElement.dir==="rtl"?"chevron-left":"chevron-right"))}function setCard(card,open,instant){var content=card.querySelector(".contents"),header=card.querySelector(".header");if(instant)content.style.transition="none";card.classList.toggle("expanded",open);header.setAttribute("aria-expanded",open?"true":"false");chevron(card,open);content.style.maxHeight=open?content.scrollHeight+"px":"0px";if(instant){content.offsetHeight;content.style.transition=""}}function isCompact(){return Math.min(window.innerWidth||9999,window.outerWidth||9999)<320}function configure(){var next=isCompact();compact=next;for(var j=0;j<multi.length;j++){var card=multi[j],header=card.querySelector(".header");if(compact){header.removeAttribute("role");header.removeAttribute("tabindex");setCard(card,true,true)}else{header.setAttribute("role","button");header.setAttribute("tabindex","0");setCard(card,card.getAttribute("data-default-expanded")==="true",true)}}for(var k=0;k<cards.length;k++){if(cards[k].classList.contains("single-event"))setCard(cards[k],true,true)}}function toggle(card){if(compact)return;var wasOpen=card.classList.contains("expanded"),cardTop=card.getBoundingClientRect().top,headerTop=card.querySelector(".header").getBoundingClientRect().top;setCard(card,!wasOpen,false);if((cardTop<0&&headerTop>=0)||(cardTop<0&&!wasOpen))smoothBy(cardTop,400);if(cardTop<0&&headerTop<0)smoothBy(cardTop-headerTop+20,400)}for(var i=0;i<multi.length;i++){(function(card){var header=card.querySelector(".header");header.addEventListener("click",function(){toggle(card)});header.addEventListener("keydown",function(event){if(event.key==="Enter"||event.key===" "){event.preventDefault();toggle(card)}})})(multi[i])}window.addEventListener("resize",configure);configure()})();';

  var output = '<!doctype html><html lang="' + escapeHtml(locale) + '" dir="' + pageDirection + '" class="' + pageDirection + '"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<meta name="disabled-adaptations" content="watch"><meta name="color-scheme" content="light dark">' +
    '<title>' + escapeHtml(cards.length ? strings.plural(cards.length) : strings.unavailableTitle) + '</title>' +
    '<style>' + STYLE + '</style></head><body><main id="content-frame">' + bodyContent + '</main>' +
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
  headers['X-QWeather-Apple-Style'] = 'active-v3';

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

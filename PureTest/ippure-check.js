/**
 * IPPure IP纯净度检测 - Surge Panel Script
 * 基于 IPPure.com 的检测逻辑
 */

const CONFIG = {
  // IP 获取接口（备用）
  ipApis: [
    "http://api.ipify.org",
    "http://v4.ident.me",
    "http://ip.sb"
  ],
  // IPPure API（需根据实际情况调整）
  ippureApi: "https://ippure.com",
  timeout: 10000
};

// 根据百分比返回对应 Emoji
function getEmoji(percentageStr) {
  try {
    const val = parseFloat(String(percentageStr).replace('%', ''));
    if (isNaN(val)) return "❓";
    if (val <= 10) return "⚪";  // 极低风险
    if (val <= 30) return "🟢";  // 低风险
    if (val <= 50) return "🟡";  // 中等风险
    if (val <= 70) return "🟠";  // 较高风险
    if (val <= 90) return "🔴";  // 高风险
    return "⚫";                  // 极高风险
  } catch {
    return "❓";
  }
}

// 风险等级文字描述
function getRiskLevel(percentageStr) {
  try {
    const val = parseFloat(String(percentageStr).replace('%', ''));
    if (isNaN(val)) return "未知";
    if (val <= 10) return "极纯净";
    if (val <= 30) return "纯净";
    if (val <= 50) return "一般";
    if (val <= 70) return "较差";
    if (val <= 90) return "差";
    return "污染";
  } catch {
    return "未知";
  }
}

// HTTP 请求封装
function httpRequest(options) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("请求超时"));
    }, CONFIG.timeout);

    $httpClient.get(options, (error, response, body) => {
      clearTimeout(timeout);
      if (error) {
        reject(error);
      } else {
        resolve({ status: response.status, headers: response.headers, body });
      }
    });
  });
}

// 获取当前出口 IP
async function getCurrentIP() {
  for (const api of CONFIG.ipApis) {
    try {
      const resp = await httpRequest({ url: api });
      if (resp.status === 200) {
        const ip = resp.body.trim();
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
          return ip;
        }
      }
    } catch (e) {
      console.log(`[IPPure] ${api} 请求失败: ${e.message}`);
    }
  }
  return null;
}

// 从 IPPure 获取检测数据
// 注意：需要根据 IPPure 实际 API 调整
async function getIPPureData(ip) {
  try {
    // 尝试 IPPure API（假设存在 JSON 接口）
    const resp = await httpRequest({
      url: `${CONFIG.ippureApi}/api/ipcheck?ip=${ip}`,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "application/json",
        "Referer": CONFIG.ippureApi
      }
    });
    
    if (resp.status === 200 && resp.body) {
      return JSON.parse(resp.body);
    }
  } catch (e) {
    console.log(`[IPPure] API 请求失败: ${e.message}`);
  }
  return null;
}

// 使用备用 IP 信息服务
async function getFallbackIPInfo(ip) {
  const fallbackApis = [
    {
      url: `http://ip-api.com/json/${ip}?lang=zh-CN`,
      parser: (data) => ({
        country: data.country || "未知",
        city: data.city || "",
        isp: data.isp || "未知",
        org: data.org || "",
        as: data.as || "",
        proxy: data.proxy ? "是" : "否",
        hosting: data.hosting ? "数据中心" : "住宅"
      })
    }
  ];

  for (const api of fallbackApis) {
    try {
      const resp = await httpRequest({ url: api.url });
      if (resp.status === 200) {
        const data = JSON.parse(resp.body);
        return api.parser(data);
      }
    } catch (e) {
      console.log(`[IPPure] Fallback API 失败: ${e.message}`);
    }
  }
  return null;
}

// 主函数
(async () => {
  let panel = {
    title: "IP 纯净度检测",
    content: "检测中...",
    icon: "network.badge.shield.half.filled",
    "icon-color": "#6366F1"
  };

  try {
    // 1. 获取当前 IP
    const ip = await getCurrentIP();
    if (!ip) {
      panel.content = "❌ 无法获取当前IP";
      panel["icon-color"] = "#EF4444";
      return $done(panel);
    }

    // 2. 尝试从 IPPure 获取数据
    let ippureData = await getIPPureData(ip);
    
    // 3. 如果 IPPure 不可用，使用备用服务
    let fallbackInfo = await getFallbackIPInfo(ip);

    // 4. 构建显示内容
    if (ippureData) {
      // IPPure 数据可用
      const pureScore = ippureData.pureScore || ippureData.score || "❓";
      const botScore = ippureData.botScore || ippureData.bot || "❓";
      const ipAttr = ippureData.ipAttr || ippureData.type || "未知";
      const ipSrc = ippureData.ipSrc || ippureData.source || "未知";
      
      const pureEmoji = getEmoji(pureScore);
      const botEmoji = getEmoji(botScore);
      const riskLevel = getRiskLevel(pureScore);

      panel.content = [
        `📍 ${ip}`,
        `━━━━━━━━━━━━━━━`,
        `${pureEmoji} 纯净度: ${pureScore} (${riskLevel})`,
        `${botEmoji} 机器人: ${botScore}`,
        `🏷️ 属性: ${ipAttr}`,
        `🌐 来源: ${ipSrc}`
      ].join("\n");

      // 根据分数调整图标颜色
      const scoreVal = parseFloat(String(pureScore).replace('%', ''));
      if (scoreVal <= 30) panel["icon-color"] = "#22C55E";
      else if (scoreVal <= 50) panel["icon-color"] = "#EAB308";
      else if (scoreVal <= 70) panel["icon-color"] = "#F97316";
      else panel["icon-color"] = "#EF4444";

    } else if (fallbackInfo) {
      // 使用备用信息
      const isRisky = fallbackInfo.proxy === "是" || fallbackInfo.hosting === "数据中心";
      const riskEmoji = isRisky ? "🟠" : "🟢";
      
      panel.content = [
        `📍 ${ip}`,
        `━━━━━━━━━━━━━━━`,
        `${riskEmoji} 状态: ${isRisky ? "可能有风险" : "看起来正常"}`,
        `🌍 位置: ${fallbackInfo.country} ${fallbackInfo.city}`,
        `🏢 ISP: ${fallbackInfo.isp}`,
        `🏷️ 类型: ${fallbackInfo.hosting}`,
        `🔒 代理: ${fallbackInfo.proxy}`,
        `━━━━━━━━━━━━━━━`,
        `⚠️ IPPure API 不可用，使用备用数据`
      ].join("\n");

      panel["icon-color"] = isRisky ? "#F97316" : "#22C55E";

    } else {
      // 仅显示 IP
      panel.content = [
        `📍 ${ip}`,
        `━━━━━━━━━━━━━━━`,
        `⚠️ 无法获取详细信息`,
        `请稍后重试或检查网络`
      ].join("\n");
      panel["icon-color"] = "#6B7280";
    }

  } catch (e) {
    panel.content = `❌ 检测失败\n${e.message || e}`;
    panel["icon-color"] = "#EF4444";
    console.log(`[IPPure] Error: ${e}`);
  }

  $done(panel);
})();
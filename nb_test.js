// 解析响应的 JSON
var bodyOri = JSON.parse($response.body);

// 修改 subscription 对象中的各个字段
bodyOri.data.processAppleReceipt.subscription = {
  "productId": "com.gingerlabs.Notability.premium_subscription",
  "originalTransactionId": "570001184068302",
  "tier": "premium",
  "refundedDate": null,
  "refundedReason": null,
  "isInBillingRetryPeriod": false,
  "expirationDate": "2099-09-09T09:09:09.000Z",
  "gracePeriodExpiresAt": null,
  "overDeviceLimit": false,
  "expirationIntent": null,
  "__typename": "AppStoreSubscription",
  "user": null,
  "status": "canceled",
  "originalPurchaseDate": "2022-09-09T09:09:09.000Z"
};

// 打印完成日志
console.log("done");

// 返回修改后的 JSON
$done({ body: JSON.stringify(bodyOri) });
var bodyOri = JSON.parse($response.body);

// 修改某些字段的值
bodyOri.data.processAppleReceipt.subscription.status = "active";
bodyOri.data.processAppleReceipt.subscription.expirationDate = "2099-12-31T23:59:59.000Z";

console.log("done");
$done({ body: JSON.stringify(bodyOri) });
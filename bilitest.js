var bodyOri = JSON.parse($response.body);
delete bodyOri.data.live_tip;
$notification.post(typeof(bodyOri), "a", bodyOri);
console.log("done")
$done({body: JSON.stringify(bodyOri)});
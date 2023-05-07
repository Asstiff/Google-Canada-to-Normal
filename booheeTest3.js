var bodyOri = JSON.parse($response.body);
delete bodyOri.data.vip;
console.log("done");
$done({body: JSON.stringify(bodyOri)});
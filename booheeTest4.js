var bodyOri = JSON.parse($response.body);
delete bodyOri.data.pop_ad;
console.log("done");
$done({body: JSON.stringify(bodyOri)});
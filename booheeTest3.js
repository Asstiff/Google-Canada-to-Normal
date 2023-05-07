var bodyOri = JSON.parse($response.body);
delete bodyOri.data.recommend_ads;
console.log("done");
$done({body: JSON.stringify(bodyOri)});
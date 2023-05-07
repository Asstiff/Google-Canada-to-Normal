var bodyOri = JSON.parse($response.body);
delete bodyOri.data;
console.log("done");
$done({body: JSON.stringify(bodyOri)});
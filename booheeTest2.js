var bodyOri = JSON.parse($response.body);
delete bodyOri.data.search_prepares;
console.log("done");
$done({body: JSON.stringify(bodyOri)});
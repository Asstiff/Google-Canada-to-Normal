var bodyOri = JSON.parse($response.body);
delete bodyOri.data.live_tip;
delete bodyOri.data.senior_gate;
delete bodyOri.data.vip_section;
delete bodyOri.data.vip_section_v2;
console.log("done");
$done({body: JSON.stringify(bodyOri)});
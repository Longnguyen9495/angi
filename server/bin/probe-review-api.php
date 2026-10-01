<?php
declare(strict_types=1);
// Fixed local endpoint; print status/count only, never response metadata or URLs.
$cases=[['GET','/provinces',200,2],['GET','/reviews?dish=com-tam&province=HCMC',200,5],['GET','/reviews?dish=pho-bo&province=HCMC',200,4],['GET','/reviews?dish=pho-bo&province=HN',200,null],['GET','/reverse',405,null]];
// Deliberately do not trigger an uncached HN provider call during a probe.
array_splice($cases,3,1);
$failed=0;
foreach($cases as [$method,$path,$expected,$count]){
    $ch=curl_init('http://angi.local/api'.$path);curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>10,CURLOPT_CUSTOMREQUEST=>$method]);
    $raw=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);$data=is_string($raw)?json_decode($raw,true):null;
    $ok=$status===$expected&&($count===null||($data['count']??null)===$count);$failed+=!$ok;
    echo json_encode(['case'=>explode('?',$path)[0],'method'=>$method,'status'=>$status,'count'=>$data['count']??null,'pass'=>$ok])."\n";
}
exit($failed?1:0);

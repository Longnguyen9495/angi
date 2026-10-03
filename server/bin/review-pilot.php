<?php
declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once __DIR__.'/../lib/ReviewService.php';
try {
    $service=new ReviewService(db());
    $args=array_slice($argv,1);
    if (in_array('--migrate',$args,true)) { $service->migrate(); echo "Review schema ready.\n"; }
    if (in_array('--verify-reverse',$args,true)) { echo json_encode(['reverse'=>$service->verifyReverse()],JSON_UNESCAPED_UNICODE)."\n"; }
    if (in_array('--live',$args,true)) {
        foreach (['com-tam','pho-bo'] as $dish) {
            $r=$service->reviews($dish,'HCMC');
            echo json_encode(['dish'=>$dish,'province'=>'HCMC','count'=>$r['count'],'quota'=>$service->quota()],JSON_UNESCAPED_UNICODE)."\n";
        }
    }
    echo json_encode(['quota'=>$service->quota()])."\n";
} catch (HttpError $e) { echo json_encode(['status'=>$e->status,'error'=>$e->getMessage()])."\n"; exit(1); }
catch (Throwable $e) { echo "Review pilot failed; sanitized configuration/database blocker.\n"; exit(1); }

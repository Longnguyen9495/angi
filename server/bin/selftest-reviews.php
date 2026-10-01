<?php
declare(strict_types=1);
require_once __DIR__.'/../lib/ReviewService.php';
$failed=0;$checks=0;
$check=function($name,$ok)use(&$failed,&$checks){$checks++;$failed+=!$ok;echo ($ok?'PASS ':'FAIL ').$name."\n";};
$reject=function($fn){try{$fn();return false;}catch(Throwable $e){return true;}};
$pdo=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$dir=sys_get_temp_dir().'/angi-review-test-'.bin2hex(random_bytes(6));
$s=new ReviewService($pdo,$dir);$s->migrate();$s->migrate();
foreach(['HN','Hà Nội','Hanoi']as $a){$check('HN alias',ReviewService::province($a)==='HN');}
foreach(['HCMC','TP HCM','Sài Gòn','Hồ Chí Minh']as $a){$check('HCMC alias',ReviewService::province($a)==='HCMC');}
$check('province reject',$reject(fn()=>ReviewService::province('Da Nang')));
$v=['title'=>'Review quán cơm tấm Sài Gòn','description'=>'Địa chỉ quán tại TP HCM'];
$check('review metadata accepted',ReviewService::relevant($v,'com-tam','HCMC'));
foreach(['cách làm','cách nấu','công thức','recipe','tai nha','mukbang','Hà Nội']as $bad){$check('exclude '.$bad,!ReviewService::relevant($v+[], 'pho-bo','HCMC')&&!ReviewService::relevant(['title'=>$v['title'],'description'=>$bad],'com-tam','HCMC'));}
$check('wrong dish',!ReviewService::relevant($v,'pho-bo','HCMC'));
$check('empty cached contract',$s->reviews('pho-bo','HN',false)===['dishId'=>'pho-bo','provinceId'=>'HN','count'=>0,'items'=>[],'basis'=>'title-description-only']);
$check('dish whitelist',$reject(fn()=>$s->reviews('pizza','HN',false)));
$check('reverse disabled before verify',$reject(fn()=>$s->reverse(['latitude'=>21,'longitude'=>105])));
$check('reverse invalid bounds',$reject(fn()=>$s->reverse(['latitude'=>91,'longitude'=>105])));
for($i=0;$i<6;$i++){$s->rate('fixture');}
$check('rate seventh rejected',$reject(fn()=>$s->rate('fixture')));
$check('max five database constraint',$reject(fn()=>$pdo->exec("INSERT INTO province_dish_reviews VALUES ('HN','pho-bo',5,'abcdefghijk','{}')")));
$check('separate tables',(int)$pdo->query('SELECT COUNT(*) FROM review_provinces')->fetchColumn()===2);
$reserve=new ReflectionMethod(ReviewService::class,'reserve');
$reserve->invoke($s,'youtube',100); $reserve->invoke($s,'youtube',1);
$check('exact quota accounting',$s->quota()['youtube']===101 && $s->quota()['searchCalls']===1 && $s->quota()['videoCalls']===1);
$reserve->invoke($s,'youtube',303);
$check('quota exhaustion rejects',$reject(fn()=>$reserve->invoke($s,'youtube',1)));
$raw=implode('',array_map('file_get_contents',glob($dir.'/*.json')));
$check('storage excludes coordinate keys',!str_contains($raw,'latitude')&&!str_contains($raw,'longitude')&&!str_contains($raw,'fixture'));
foreach(glob($dir.'/*')as $file){unlink($file);}rmdir($dir);
echo "$checks checks, $failed failures.\n";exit($failed?1:0);

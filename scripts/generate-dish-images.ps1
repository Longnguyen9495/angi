# Generates the prototype's local dish illustrations (640x480 JPEG, top-down flat style).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/generate-dish-images.ps1
# Output: public/images/dishes/*.jpg — static raster assets, no animation.

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'public\images\dishes'
New-Item -ItemType Directory -Force $outDir | Out-Null

$W = 640; $H = 480

function C([string]$hex, [int]$a = 255) {
  $h = $hex.TrimStart('#')
  return [System.Drawing.Color]::FromArgb($a, [Convert]::ToInt32($h.Substring(0,2),16), [Convert]::ToInt32($h.Substring(2,2),16), [Convert]::ToInt32($h.Substring(4,2),16))
}
function Brush([string]$hex, [int]$a = 255) { New-Object System.Drawing.SolidBrush (C $hex $a) }
function PenOf([string]$hex, [float]$w, [int]$a = 255) {
  $p = New-Object System.Drawing.Pen (C $hex $a), $w
  $p.StartCap = 'Round'; $p.EndCap = 'Round'
  return $p
}

function Ellipse($g, [string]$hex, [float]$cx, [float]$cy, [float]$rx, [float]$ry, [int]$a = 255) {
  $b = Brush $hex $a; $g.FillEllipse($b, $cx - $rx, $cy - $ry, 2*$rx, 2*$ry); $b.Dispose()
}
function RotEllipse($g, [string]$hex, [float]$cx, [float]$cy, [float]$rx, [float]$ry, [float]$deg, [int]$a = 255) {
  $st = $g.Save(); $g.TranslateTransform($cx, $cy); $g.RotateTransform($deg)
  Ellipse $g $hex 0 0 $rx $ry $a
  $g.Restore($st)
}
function RadialDisc($g, [string]$inner, [string]$outer, [float]$cx, [float]$cy, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse($cx - $r, $cy - $r, 2*$r, 2*$r)
  $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
  $pgb.CenterColor = C $inner
  $pgb.SurroundColors = @(C $outer)
  $pgb.CenterPoint = New-Object System.Drawing.PointF(($cx - $r*0.25), ($cy - $r*0.3))
  $g.FillPath($pgb, $path); $pgb.Dispose(); $path.Dispose()
}

function Background($g, [string]$base, [string]$stripe) {
  $b = Brush $base; $g.FillRectangle($b, 0, 0, $W, $H); $b.Dispose()
  # linen weave
  $p = PenOf $stripe 1 40
  for ($x = 0; $x -lt $W; $x += 7) { $g.DrawLine($p, $x, 0, $x, $H) }
  for ($y = 0; $y -lt $H; $y += 7) { $g.DrawLine($p, 0, $y, $W, $y) }
  $p.Dispose()
  # soft vignette
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(-160, -140, $W + 320, $H + 280)
  $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
  $pgb.CenterColor = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
  $pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(70, 40, 25, 10))
  $g.FillPath($pgb, $path); $pgb.Dispose(); $path.Dispose()
}

function Shadow($g, [float]$cx, [float]$cy, [float]$r) {
  for ($i = 0; $i -lt 6; $i++) { Ellipse $g '2b1a0e' ($cx + 10) ($cy + 16) ($r + 18 - $i*3) ($r + 14 - $i*3) 14 }
}

function Chopsticks($g, [string]$hex) {
  $p = PenOf $hex 11; $g.DrawLine($p, 470, 60, 610, 300); $p.Dispose()
  $p = PenOf $hex 11; $g.DrawLine($p, 500, 48, 630, 270); $p.Dispose()
  $p = PenOf 'ffffff' 3 60; $g.DrawLine($p, 468, 58, 540, 180); $p.Dispose()
}

function Herbs($g, $rnd, [float]$cx, [float]$cy, [float]$spread, [int]$n, [string]$hex = '4f9a4a') {
  for ($i = 0; $i -lt $n; $i++) {
    $a = $rnd.NextDouble() * 6.283; $d = [Math]::Sqrt($rnd.NextDouble()) * $spread
    $x = $cx + [Math]::Cos($a) * $d; $y = $cy + [Math]::Sin($a) * $d
    $shade = @($hex, '3d8a3c', '69b057')[$i % 3]
    RotEllipse $g $shade $x $y 11 5 ($rnd.Next(0, 180))
    $p = PenOf '2f6e2f' 1.4 150; $g.DrawLine($p, $x - 8, $y, $x + 8, $y); $p.Dispose()
  }
}

function ChiliRings($g, $rnd, [float]$cx, [float]$cy, [float]$spread, [int]$n) {
  for ($i = 0; $i -lt $n; $i++) {
    $x = $cx + ($rnd.NextDouble() - 0.5) * $spread * 2; $y = $cy + ($rnd.NextDouble() - 0.5) * $spread * 2
    Ellipse $g 'c8312b' $x $y 7 7; Ellipse $g 'f0b47a' $x $y 3.2 3.2
  }
}

function Slices($g, $rnd, [float]$cx, [float]$cy, [float]$spread, [int]$n, [string]$hex, [string]$edge, [float]$rx, [float]$ry) {
  for ($i = 0; $i -lt $n; $i++) {
    $a = ($i / [Math]::Max(1,$n)) * 6.283 + $rnd.NextDouble() * 0.5
    $d = $spread * (0.35 + $rnd.NextDouble() * 0.55)
    $x = $cx + [Math]::Cos($a) * $d; $y = $cy + [Math]::Sin($a) * $d
    $deg = $rnd.Next(0, 180)
    RotEllipse $g $edge $x $y ($rx + 2) ($ry + 2) $deg
    RotEllipse $g $hex $x $y $rx $ry $deg
  }
}

function Noodles($g, $rnd, [float]$cx, [float]$cy, [float]$r, [string]$hex, [float]$w) {
  $p = PenOf $hex $w 235
  for ($i = 0; $i -lt 38; $i++) {
    $a = $rnd.NextDouble() * 6.283; $d = $rnd.NextDouble() * $r * 0.8
    $x = $cx + [Math]::Cos($a) * $d; $y = $cy + [Math]::Sin($a) * $d
    $s = 30 + $rnd.NextDouble() * 50
    $g.DrawArc($p, [float]($x - $s/2), [float]($y - $s/3), [float]$s, [float]($s*0.66), [float]$rnd.Next(0,360), [float](70 + $rnd.Next(0,90)))
  }
  $p.Dispose()
}

function Bowl($g, [float]$cx, [float]$cy, [float]$r, [string]$ceramic, [string]$rim, [string]$broth, [string]$brothEdge) {
  Shadow $g $cx $cy $r
  RadialDisc $g 'ffffff' $ceramic $cx $cy $r
  $p = PenOf $rim 5; $g.DrawEllipse($p, $cx - $r + 9, $cy - $r + 9, 2*$r - 18, 2*$r - 18); $p.Dispose()
  RadialDisc $g $broth $brothEdge $cx $cy ($r - 26)
}

function Plate($g, [float]$cx, [float]$cy, [float]$r, [string]$rim) {
  Shadow $g $cx $cy $r
  RadialDisc $g 'fffdf8' 'e9e2d4' $cx $cy $r
  $p = PenOf $rim 3 170; $g.DrawEllipse($p, $cx - $r + 16, $cy - $r + 16, 2*$r - 32, 2*$r - 32); $p.Dispose()
}

function RiceMound($g, $rnd, [float]$cx, [float]$cy, [float]$r, [string]$hex = 'f7f1e3') {
  Ellipse $g 'b9a888' ($cx + 6) ($cy + 10) ($r * 1.02) ($r * 0.95) 90
  for ($i = 0; $i -lt 14; $i++) {
    $a = $rnd.NextDouble() * 6.283; $d = $rnd.NextDouble() * $r * 0.45
    Ellipse $g $hex ($cx + [Math]::Cos($a)*$d) ($cy + [Math]::Sin($a)*$d) ($r*0.55) ($r*0.5)
  }
  for ($i = 0; $i -lt 90; $i++) {
    $a = $rnd.NextDouble() * 6.283; $d = [Math]::Sqrt($rnd.NextDouble()) * $r * 0.9
    RotEllipse $g 'd8ccb3' ($cx + [Math]::Cos($a)*$d) ($cy + [Math]::Sin($a)*$d) 4 1.8 ($rnd.Next(0,180)) 200
  }
}

function Label($g, [string]$text) {
  # small, unobtrusive caption strip so each placeholder is identifiable
  $b = Brush '1f1812' 120; $g.FillRectangle($b, 0, $H - 34, $W, 34); $b.Dispose()
  $font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
  $tb = Brush 'fff8ec'; $g.DrawString($text, $font, $tb, 16, $H - 29); $tb.Dispose(); $font.Dispose()
}

function Save($bmp, [string]$name) {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)
  $bmp.Save((Join-Path $outDir $name), $codec, $ep)
}

$dishes = @(
  @{ file='pho-bo.jpg'; kind='bowl'; bg='e9d9bd'; ceramic='eef1ee'; rim='3f6d8c'; broth='f0d9a6'; edge='d9b877'; noodle='fbf6ea'; label='Phở bò tái chín'; meat='b86b58'; meatEdge='8e4a3c'; herbs=16; chili=5 },
  @{ file='bun-cha.jpg'; kind='buncha'; bg='e5d3b3'; label='Bún chả Hà Nội' },
  @{ file='bun-rieu.jpg'; kind='bowl'; bg='efdcc2'; ceramic='f3eee6'; rim='a64b2a'; broth='e7803f'; edge='c95f2a'; noodle='fdf8ef'; label='Bún riêu cua'; meat='d9a45a'; meatEdge='a86e2d'; herbs=12; chili=0; tomato=6 },
  @{ file='banh-cuon.jpg'; kind='rolls'; bg='e8dcc6'; roll='f6f1e6'; fill='c8a27a'; label='Bánh cuốn nóng'; onion=1 },
  @{ file='com-dau-phu.jpg'; kind='plate'; bg='e3d6bf'; label='Cơm đậu phụ sốt cà chua'; protein='tofu' },
  @{ file='bun-bo-hue.jpg'; kind='bowl'; bg='dcc3a3'; ceramic='efe7dc'; rim='7a3b22'; broth='d8562c'; edge='b03e1c'; noodle='fbf3e4'; label='Bún bò Huế'; meat='9a5a44'; meatEdge='6e3a2a'; herbs=14; chili=9 },
  @{ file='mi-quang.jpg'; kind='bowl'; bg='e6d2ae'; ceramic='f1ece2'; rim='2f6f5e'; broth='e8b04c'; edge='cf8f2b'; noodle='f2c75c'; label='Mì Quảng tôm thịt'; meat='e07b4f'; meatEdge='b85530'; herbs=18; chili=3; cracker=1 },
  @{ file='com-ga.jpg'; kind='plate'; bg='eadcc0'; label='Cơm gà Hội An'; protein='chicken'; rice='f1cf6a' },
  @{ file='banh-beo.jpg'; kind='banhbeo'; bg='e1cfae'; label='Bánh bèo chén' },
  @{ file='com-chay.jpg'; kind='plate'; bg='e2d8c0'; label='Cơm chay Huế'; protein='veg' },
  @{ file='com-tam.jpg'; kind='plate'; bg='e8d5b5'; label='Cơm tấm sườn bì chả'; protein='rib' },
  @{ file='hu-tieu.jpg'; kind='bowl'; bg='e7d8bf'; ceramic='f4f1ea'; rim='b0452c'; broth='f3e2bc'; edge='dcc08a'; noodle='fbf7ee'; label='Hủ tiếu Nam Vang'; meat='e9855b'; meatEdge='c05f38'; herbs=14; chili=2 },
  @{ file='banh-mi.jpg'; kind='banhmi'; bg='d9c09a'; label='Bánh mì thịt' },
  @{ file='goi-cuon.jpg'; kind='rolls'; bg='e5dcc4'; roll='eef3e8'; fill='7fb069'; label='Gỏi cuốn chay'; onion=0 },
  @{ file='canh-chua.jpg'; kind='bowl'; bg='e3d0ae'; ceramic='efe9df'; rim='2f5f7a'; broth='e99a3c'; edge='cc7422'; noodle=''; label='Canh chua cá lóc & cơm'; meat='efe3cf'; meatEdge='c9b89a'; herbs=16; chili=4; tomato=5; pineapple=5 },
  @{ file='banh-xeo.jpg'; kind='banhxeo'; bg='e6d5b4'; label='Bánh xèo miền Tây' },
  @{ file='lau-nam.jpg'; kind='hotpot'; bg='dccbb0'; label='Lẩu nấm chay' }
)

$seed = 11
foreach ($d in $dishes) {
  $seed++
  $rnd = New-Object System.Random $seed
  $bmp = New-Object System.Drawing.Bitmap $W, $H
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.TextRenderingHint = 'AntiAliasGridFit'
  Background $g $d.bg 'fff6e6'
  $cx = 300; $cy = 222

  switch ($d.kind) {
    'bowl' {
      Chopsticks $g '8a5a34'
      Bowl $g $cx $cy 190 $d.ceramic $d.rim $d.broth $d.edge
      if ($d.noodle) { Noodles $g $rnd $cx $cy 150 $d.noodle 6 }
      Slices $g $rnd $cx $cy 120 7 $d.meat $d.meatEdge 30 17
      if ($d.tomato) { for ($i=0; $i -lt $d.tomato; $i++) { $a=$i*1.25; RotEllipse $g 'd6452f' ($cx+[Math]::Cos($a)*85) ($cy+[Math]::Sin($a)*70) 20 14 ($i*40); RotEllipse $g 'f08a64' ($cx+[Math]::Cos($a)*85) ($cy+[Math]::Sin($a)*70) 10 6 ($i*40) } }
      if ($d.pineapple) { for ($i=0; $i -lt $d.pineapple; $i++) { RotEllipse $g 'f2cf55' ($cx - 60 + $i*28) ($cy + 55 - ($i%2)*30) 16 9 ($i*33) } }
      if ($d.cracker) { RotEllipse $g 'e9c98f' ($cx + 110) ($cy - 90) 62 40 20; for ($i=0;$i -lt 20;$i++){ Ellipse $g '3b2a1a' ($cx+80+$rnd.Next(0,60)) ($cy-110+$rnd.Next(0,40)) 1.6 1.6 } }
      Herbs $g $rnd $cx ($cy - 10) 110 $d.herbs
      if ($d.chili) { ChiliRings $g $rnd ($cx + 40) ($cy + 30) 70 $d.chili }
      # lime wedge
      RotEllipse $g '9cc64a' ($cx - 150) ($cy + 150) 34 20 -30; RotEllipse $g 'd9ec9a' ($cx - 150) ($cy + 150) 26 13 -30
    }
    'buncha' {
      Plate $g 185 250 150 'b98b5a'
      Noodles $g $rnd 185 250 120 'fbf7ee' 5
      Noodles $g $rnd 185 250 100 'f4eee0' 4
      Bowl $g 440 215 135 'f3eee6' '8a3f24' 'd99c5a' 'b9773a'
      for ($i=0; $i -lt 6; $i++) { $a=$i*1.05; $x=440+[Math]::Cos($a)*55; $y=215+[Math]::Sin($a)*50; Ellipse $g '5a321d' $x $y 26 22; Ellipse $g '8a5530' ($x-4) ($y-4) 17 13 }
      Slices $g $rnd 440 215 40 5 'f2b56b' 'd48a3a' 11 7
      Herbs $g $rnd 170 110 70 20
      ChiliRings $g $rnd 470 280 25 3
    }
    'plate' {
      Chopsticks $g '6b4a2c'
      Plate $g $cx $cy 195 '9c7a4e'
      $riceHex = 'f7f1e3'; if ($d.rice) { $riceHex = $d.rice }
      RiceMound $g $rnd ($cx - 55) ($cy - 10) 85 $riceHex
      switch ($d.protein) {
        'rib' {
          RotEllipse $g '6e3517' ($cx + 70) ($cy - 30) 80 42 -15; RotEllipse $g 'a4521f' ($cx + 70) ($cy - 34) 70 34 -15
          $p = PenOf '4a220d' 5; for ($i=0;$i -lt 4;$i++){ $g.DrawLine($p, $cx+20+$i*28, $cy-60, $cx+40+$i*28, $cy-5) }; $p.Dispose()
          $b = Brush 'f1c24f'; $g.FillRectangle($b, $cx + 30, $cy + 40, 70, 44); $b.Dispose()
          for ($i=0;$i -lt 30;$i++){ RotEllipse $g 'efe2c0' ($cx - 20 + $rnd.Next(0,50)) ($cy + 70 + $rnd.Next(0,40)) 9 1.6 ($rnd.Next(0,180)) }
          Herbs $g $rnd ($cx - 60) ($cy - 30) 50 10 '6cae4d'
        }
        'chicken' {
          for ($i=0;$i -lt 26;$i++){ RotEllipse $g @('f3e1c2','e9cfa4','f7ead2')[$i%3] ($cx + 40 + $rnd.Next(0,90)) ($cy - 70 + $rnd.Next(0,130)) 18 5 ($rnd.Next(0,180)) }
          for ($i=0;$i -lt 10;$i++){ RotEllipse $g 'efe7f2' ($cx + 20 + $rnd.Next(0,110)) ($cy - 60 + $rnd.Next(0,120)) 14 3 ($rnd.Next(0,180)) 220 }
          Herbs $g $rnd ($cx + 90) ($cy + 10) 60 16
        }
        'tofu' {
          for ($i=0;$i -lt 6;$i++){ $x=$cx+40+($i%3)*42; $y=$cy-40+[Math]::Floor($i/3)*48; $b=Brush 'e9b24e'; $g.FillRectangle($b,$x,$y,36,36); $b.Dispose() }
          RotEllipse $g 'd84d2e' ($cx + 85) ($cy - 5) 90 60 0 150
          for ($i=0;$i -lt 5;$i++){ RotEllipse $g 'e3553a' ($cx + 50 + $i*20) ($cy + 70) 14 9 ($i*30) }
          Herbs $g $rnd ($cx - 40) ($cy + 110) 40 8 '5aa24e'
        }
        'veg' {
          for ($i=0;$i -lt 5;$i++){ $a=$i*0.9-1.2; Ellipse $g '8b6a4a' ($cx+80+[Math]::Cos($a)*60) ($cy+[Math]::Sin($a)*80) 20 16; Ellipse $g 'b28a61' ($cx+80+[Math]::Cos($a)*60) ($cy-4+[Math]::Sin($a)*80) 12 8 }
          for ($i=0;$i -lt 4;$i++){ $b=Brush 'ecd79a'; $g.FillRectangle($b, $cx+20+$i*26, $cy+60, 22, 22); $b.Dispose() }
          Herbs $g $rnd ($cx + 40) ($cy - 80) 50 18 '3f8f3e'
          for ($i=0;$i -lt 8;$i++){ RotEllipse $g 'e8883a' ($cx - 20 + $rnd.Next(0,60)) ($cy + 110 + $rnd.Next(0,20)) 12 3 ($rnd.Next(0,180)) }
        }
      }
      # cucumber
      for ($i=0;$i -lt 3;$i++){ Ellipse $g '5f9a45' ($cx - 120 + $i*18) ($cy + 115) 17 17; Ellipse $g 'dfeec1' ($cx - 120 + $i*18) ($cy + 115) 13 13 }
    }
    'rolls' {
      Plate $g ($cx - 20) $cy 190 'a5845a'
      for ($i=0;$i -lt 3;$i++){
        $y = $cy - 80 + $i*72
        $b = Brush $d.roll 235; $g.FillRectangle($b, $cx - 150, $y, 230, 58); $g.FillEllipse($b, $cx - 180, $y, 60, 58); $g.FillEllipse($b, $cx + 50, $y, 60, 58); $b.Dispose()
        $p = PenOf $d.fill 6 160; $g.DrawLine($p, $cx - 140, $y + 22, $cx + 70, $y + 20); $g.DrawLine($p, $cx - 130, $y + 38, $cx + 60, $y + 40); $p.Dispose()
        $p = PenOf 'ffffff' 3 120; $g.DrawLine($p, $cx - 130, $y + 10, $cx + 40, $y + 10); $p.Dispose()
      }
      if ($d.onion -eq 1) { for ($i=0;$i -lt 40;$i++){ RotEllipse $g 'b0702c' ($cx - 150 + $rnd.Next(0,240)) ($cy - 90 + $rnd.Next(0,200)) 4 2 ($rnd.Next(0,180)) } ; RotEllipse $g 'f0d8b0' ($cx+120) ($cy+120) 50 26 -20; RotEllipse $g 'e3c190' ($cx+120) ($cy+120) 40 18 -20 }
      else { Herbs $g $rnd ($cx + 20) ($cy - 40) 120 10 }
      Bowl $g 520 360 70 'f2ece2' '7a4a2a' 'c9803e' 'a55f22'
      ChiliRings $g $rnd 520 360 18 3
    }
    'banhmi' {
      $b = Brush 'a37648'; $g.FillRectangle($b, 40, 70, 560, 330); $b.Dispose()
      $p = PenOf '8c6038' 2 120; for ($y=80;$y -lt 400;$y+=18){ $g.DrawLine($p, 40, $y, 600, $y + 6) }; $p.Dispose()
      RotEllipse $g '2b1a0e' 330 245 240 80 -8 60
      RotEllipse $g 'c9822f' 320 230 240 78 -8
      RotEllipse $g 'e3a64b' 318 222 222 62 -8
      RotEllipse $g 'f4e7c8' 318 232 190 30 -8
      for ($i=0;$i -lt 8;$i++){ RotEllipse $g 'e07b6a' (170 + $i*40) (236 - $i*5) 22 12 (-8) }
      for ($i=0;$i -lt 12;$i++){ RotEllipse $g 'ec8a35' (150 + $i*28) (224 - $i*4) 14 3 (-20) }
      Herbs $g $rnd 330 212 150 14
      ChiliRings $g $rnd 360 225 90 5
    }
    'banhxeo' {
      Plate $g $cx $cy 195 '8c6b44'
      $path = New-Object System.Drawing.Drawing2D.GraphicsPath
      $path.AddPie(($cx - 170), ($cy - 150), 340, 300, 190, 180)
      $b = Brush 'e9b43a'; $g.FillPath($b, $path); $b.Dispose(); $path.Dispose()
      for ($i=0;$i -lt 40;$i++){ Ellipse $g @('c7832a','b86f1f','d99a30')[$i%3] ($cx - 150 + $rnd.Next(0,300)) ($cy - 110 + $rnd.Next(0,100)) (3 + $rnd.Next(0,6)) (2 + $rnd.Next(0,4)) 200 }
      Slices $g $rnd ($cx) ($cy + 20) 70 5 'f08a5d' 'c9603a' 20 10
      for ($i=0;$i -lt 18;$i++){ RotEllipse $g 'f6f0dc' ($cx - 80 + $rnd.Next(0,160)) ($cy + 10 + $rnd.Next(0,40)) 14 3 ($rnd.Next(0,180)) }
      Herbs $g $rnd ($cx + 120) ($cy + 120) 50 16
    }
    'banhbeo' {
      $b = Brush '6d4a2e'; $g.FillRectangle($b, 60, 50, 520, 360); $b.Dispose()
      for ($r=0;$r -lt 3;$r++){ for ($c=0;$c -lt 4;$c++){
        $x = 135 + $c*125; $y = 120 + $r*115
        Ellipse $g '2b1a0e' ($x+4) ($y+6) 50 50 60
        RadialDisc $g 'ffffff' 'e3d6c2' $x $y 50
        Ellipse $g 'f7f1e6' $x $y 38 38
        for ($i=0;$i -lt 10;$i++){ Ellipse $g 'e56f3c' ($x - 16 + $rnd.Next(0,32)) ($y - 16 + $rnd.Next(0,32)) 4 3 }
        Ellipse $g 'f4d9a0' ($x+10) ($y+8) 6 5
      } }
    }
    'hotpot' {
      Shadow $g $cx $cy 200
      Ellipse $g '3a3a38' $cx $cy 200 200; Ellipse $g '5a5a56' $cx $cy 188 188
      RadialDisc $g 'e8c57f' 'c79445' $cx $cy 172
      for ($i=0;$i -lt 12;$i++){ $a=$i*0.52; $x=$cx+[Math]::Cos($a)*105; $y=$cy+[Math]::Sin($a)*95; Ellipse $g '8a5a36' $x $y 26 22; Ellipse $g 'b98a5d' ($x-3) ($y-4) 18 13 }
      for ($i=0;$i -lt 7;$i++){ $b=Brush 'f1e6c9'; $g.FillRectangle($b, $cx - 70 + $i*20, $cy - 20 + ($i%2)*16, 18, 18); $b.Dispose() }
      for ($i=0;$i -lt 20;$i++){ RotEllipse $g 'f6efe0' ($cx - 40 + $rnd.Next(0,80)) ($cy + 40 + $rnd.Next(0,40)) 12 2 ($rnd.Next(0,180)) }
      Herbs $g $rnd ($cx - 30) ($cy - 60) 60 22 '3f8f3e'
      ChiliRings $g $rnd ($cx + 60) ($cy + 60) 20 2
    }
  }

  Save $bmp $d.file
  $g.Dispose(); $bmp.Dispose()
  Write-Output "generated $($d.file)"
}

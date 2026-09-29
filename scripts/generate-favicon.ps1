# Generates public/favicon.png (64x64): green tile with a cream bowl and a sprout.
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$bmp = New-Object System.Drawing.Bitmap 64, 64
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::Transparent)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 16
$path.AddArc(0, 0, $r, $r, 180, 90); $path.AddArc(64 - $r, 0, $r, $r, 270, 90)
$path.AddArc(64 - $r, 64 - $r, $r, $r, 0, 90); $path.AddArc(0, 64 - $r, $r, $r, 90, 90)
$path.CloseFigure()
$g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 47, 122, 62))), $path)
$cream = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 251, 246, 236))
$g.FillPie($cream, 12, 14, 40, 40, 0, 180)
$g.FillRectangle($cream, 10, 32, 44, 4)
$leaf = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 226, 167, 46))
$g.FillEllipse($leaf, 22, 14, 10, 16)
$g.FillEllipse($leaf, 32, 16, 10, 14)
$bmp.Save((Join-Path $root 'public\favicon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

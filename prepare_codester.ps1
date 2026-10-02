Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = "C:\Users\Dhora\Desktop\Sevendor\Currently Working\Apex infra"
$outDir = Join-Path $baseDir "codester_assets"

if (Test-Path $outDir) {
    Remove-Item -Recurse -Force $outDir
}
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "Creating 200x200 Icon..."
$iconPath = Join-Path $outDir "icon.png"
$bmpIcon = New-Object System.Drawing.Bitmap(200, 200)
$gIcon = [System.Drawing.Graphics]::FromImage($bmpIcon)
$gIcon.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gIcon.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Background: Rich navy blue gradient
$brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(200, 200)),
    [System.Drawing.Color]::FromArgb(255, 11, 27, 49),
    [System.Drawing.Color]::FromArgb(255, 17, 43, 77)
)
$gIcon.FillRectangle($brushBg, 0, 0, 200, 200)

# Golden subtle border
$penGold = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 234, 179, 8), 4)
$gIcon.DrawRectangle($penGold, 2, 2, 196, 196)

# Load existing logo to center in icon
$srcLogoPath = Join-Path $baseDir "backend\public\assets\logo.png"
if (Test-Path $srcLogoPath) {
    $srcLogo = [System.Drawing.Image]::FromFile($srcLogoPath)
    $logoW = 160
    $logoH = [int]($srcLogo.Height * ($logoW / $srcLogo.Width))
    if ($logoH -gt 130) {
        $logoH = 130
        $logoW = [int]($srcLogo.Width * ($logoH / $srcLogo.Height))
    }
    $posX = [int]((200 - $logoW) / 2)
    $posY = [int]((160 - $logoH) / 2) + 10
    $gIcon.DrawImage($srcLogo, $posX, $posY, $logoW, $logoH)
    $srcLogo.Dispose()
}

# Subtitle text
$fontSub = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
$brushGold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 204, 21))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$gIcon.DrawString("APEX INFRA", $fontSub, $brushGold, 100, 160, $sf)

$bmpIcon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$gIcon.Dispose()
$bmpIcon.Dispose()
Write-Host "Created $iconPath (200x200)"

Write-Host "Creating 1600x800 Preview Banner..."
$prevPath = Join-Path $outDir "preview.png"
$bmpPrev = New-Object System.Drawing.Bitmap(1600, 800)
$gPrev = [System.Drawing.Graphics]::FromImage($bmpPrev)
$gPrev.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gPrev.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Background: Premium Dark Navy Slate
$bgBrushPrev = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(1600, 800)),
    [System.Drawing.Color]::FromArgb(255, 10, 25, 47),
    [System.Drawing.Color]::FromArgb(255, 15, 34, 64)
)
$gPrev.FillRectangle($bgBrushPrev, 0, 0, 1600, 800)

# Inset card / background artwork
$bgArtPath = Join-Path $baseDir "frontend\dist\cta_banner_hd.png"
if (Test-Path $bgArtPath) {
    $artImg = [System.Drawing.Image]::FromFile($bgArtPath)
    $gPrev.DrawImage($artImg, 700, 80, 850, 640)
    $artImg.Dispose()
}

# Overlay left gradient for clean text readability
$leftGradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(600, 0)),
    (New-Object System.Drawing.Point(850, 0)),
    [System.Drawing.Color]::FromArgb(255, 10, 25, 47),
    [System.Drawing.Color]::FromArgb(0, 10, 25, 47)
)
$gPrev.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 25, 47))), 0, 0, 600, 800)
$gPrev.FillRectangle($leftGradBrush, 600, 0, 250, 800)

# Golden accent pill
$pillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 234, 179, 8))
$gPrev.FillRectangle($pillBrush, 80, 100, 280, 36)

$fontBadge = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
$brushDark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
$gPrev.DrawString("LARAVEL 11 + REACT 19", $fontBadge, $brushDark, 95, 108)

# Title
$fontTitle = New-Object System.Drawing.Font("Arial", 44, [System.Drawing.FontStyle]::Bold)
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$gPrev.DrawString("Apex Infra", $fontTitle, $brushWhite, 80, 155)

# Subtitle
$fontSub = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Bold)
$brushGoldLight = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 204, 21))
$gPrev.DrawString("Real Estate & Construction ERP", $fontSub, $brushGoldLight, 80, 235)

# Bullet points / Highlights
$fontBullets = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Regular)
$brushLightGray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 226, 232, 240))

$bullets = @(
    "+ Dynamic Property Search & Filter Showcase",
    "+ SAP Fiori Multi-Tab Admin Dashboard",
    "+ Lead CRM & WhatsApp Enquiry Engine",
    "+ Daily Construction Site Agenda Matrix",
    "+ Full Double-Entry Accounting Ledger",
    "+ Wallet & Banking Cashflow Transfers",
    "+ Invoices, Quotations & EMI Loan Tracker",
    "+ Docker & Dokploy 1-Click Deployment"
)

$yPos = 310
foreach ($b in $bullets) {
    # Small gold dot
    $gPrev.FillEllipse($brushGoldLight, 85, $yPos + 5, 8, 8)
    $gPrev.DrawString($b, $fontBullets, $brushLightGray, 105, $yPos)
    $yPos += 45
}

# Footer badges
$fontFooter = New-Object System.Drawing.Font("Arial", 13, [System.Drawing.FontStyle]::Bold)
$gPrev.DrawString("PHP 8.2+  |  TypeScript  |  MySQL & SQLite  |  Rest API", $fontFooter, $brushGoldLight, 80, 710)

$bmpPrev.Save($prevPath, [System.Drawing.Imaging.ImageFormat]::Png)
$gPrev.Dispose()
$bmpPrev.Dispose()
Write-Host "Created $prevPath (1600x800)"

Write-Host "Preparing Staging folder for clean ZIP packaging..."
$stagingDir = Join-Path $baseDir "staging_codester\Apex_Infra_v1.0"
if (Test-Path $stagingDir) {
    Remove-Item -Recurse -Force $stagingDir
}
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

# Copy Backend (excluding vendor, logs, database.sqlite)
Write-Host "Copying backend files..."
$targetBackend = Join-Path $stagingDir "backend"
New-Item -ItemType Directory -Force -Path $targetBackend | Out-Null
robocopy (Join-Path $baseDir "backend") $targetBackend /E /XD "vendor" "storage\logs" "storage\framework\cache" "storage\framework\sessions" "storage\framework\views" /XF "database.sqlite" | Out-Null

# Copy Frontend (excluding node_modules)
Write-Host "Copying frontend files..."
$targetFrontend = Join-Path $stagingDir "frontend"
New-Item -ItemType Directory -Force -Path $targetFrontend | Out-Null
robocopy (Join-Path $baseDir "frontend") $targetFrontend /E /XD "node_modules" | Out-Null

# Copy root configs
Copy-Item (Join-Path $baseDir "docker-compose.yml") -Destination $stagingDir
Copy-Item (Join-Path $baseDir ".env.docker") -Destination $stagingDir

# Create Documentation
$docDir = Join-Path $stagingDir "Documentation"
New-Item -ItemType Directory -Force -Path $docDir | Out-Null
$readmeContent = @"
=====================================================
Apex Infra - Real Estate & Construction ERP System
Version 1.0 (Laravel 11 + React 19 / TypeScript)
=====================================================

1. QUICK SHARED HOSTING (cPanel / Hostinger)
---------------------------------------------
- Upload contents of 'frontend/dist' directly into 'public_html/'
- Create a subdomain (e.g. api.yourdomain.com) pointing to 'public_html/api/public'
- Upload 'backend' folder to 'public_html/api'
- Set up MySQL database, update 'backend/.env'
- Run migrations:
  php artisan migrate --force
  php artisan db:seed --class=DemoDataSeeder --force
  php artisan storage:link

2. DOCKER / VPS (DOKPLOY) DEPLOYMENT
---------------------------------------------
- Copy '.env.docker' to '.env'
- Run: docker compose up -d --build
- Web: Port 3001 | API: Port 3002

DEFAULT ADMIN CREDENTIALS:
URL: /admin
User: admin
Pass: admin123
"@
Set-Content -Path (Join-Path $docDir "README.txt") -Value $readmeContent

# Create clean ZIP file
$zipDest = Join-Path $outDir "apex-infra-v1.0.zip"
Write-Host "Compressing clean package into $zipDest ..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $zipDest, [System.IO.Compression.CompressionLevel]::Optimal, $true)

# Cleanup staging
Remove-Item -Recurse -Force (Join-Path $baseDir "staging_codester")

Write-Host "=== ALL CODESTER FILES PREPARED SUCCESSFULLY! ==="
Write-Host "Location: $outDir"
Get-ChildItem $outDir

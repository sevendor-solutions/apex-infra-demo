Add-Type -AssemblyName System.Drawing

$baseDir = "C:\Users\Dhora\Desktop\Sevendor\Currently Working\Apex infra"
$outDir = Join-Path $baseDir "codester_assets"
$logoPath = Join-Path $baseDir "backend\public\uploads\branding\apex_infra_logo.jpg"

if (-not (Test-Path $logoPath)) {
    Write-Error "Logo not found at $logoPath"
    exit 1
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($logoPath)

# Crop the actual logo mark from [460, 85, 455, 605] with slight padding
$cropX = 450
$cropY = 80
$cropW = 465
$cropH = 615
$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)

Write-Host "Creating 200x200 Icon with Apex Infra Logo..."
$iconBmp = New-Object System.Drawing.Bitmap(200, 200)
$gIcon = [System.Drawing.Graphics]::FromImage($iconBmp)
$gIcon.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gIcon.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Clean white background with smooth subtle border
$gIcon.Clear([System.Drawing.Color]::White)

# Fit cropped logo into 180x180 centered
$destW = [int](170 * ($cropW / $cropH))
$destH = 170
$destX = [int]((200 - $destW) / 2)
$destY = [int]((200 - $destH) / 2)

$destRect = New-Object System.Drawing.Rectangle($destX, $destY, $destW, $destH)
$gIcon.DrawImage($srcBmp, $destRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

# Modern subtle gold/navy border
$penBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 15, 23, 42), 4)
$gIcon.DrawRectangle($penBorder, 2, 2, 196, 196)

$iconSavePath = Join-Path $outDir "icon.png"
$iconBmp.Save($iconSavePath, [System.Drawing.Imaging.ImageFormat]::Png)
$gIcon.Dispose()
$iconBmp.Dispose()
Write-Host "Saved: $iconSavePath (200x200)"

Write-Host "Updating 1600x800 Preview Banner with Apex Infra Logo..."
$prevBmp = New-Object System.Drawing.Bitmap(1600, 800)
$gPrev = [System.Drawing.Graphics]::FromImage($prevBmp)
$gPrev.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gPrev.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Premium Dark Navy Slate background
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
    $gPrev.DrawImage($artImg, 720, 80, 820, 640)
    $artImg.Dispose()
}

# Overlay left gradient for clean text readability
$leftGradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(620, 0)),
    (New-Object System.Drawing.Point(850, 0)),
    [System.Drawing.Color]::FromArgb(255, 10, 25, 47),
    [System.Drawing.Color]::FromArgb(0, 10, 25, 47)
)
$gPrev.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 25, 47))), 0, 0, 620, 800)
$gPrev.FillRectangle($leftGradBrush, 620, 0, 230, 800)

# Draw Apex Infra logo with rounded container in header
$logoBoxW = 110
$logoBoxH = 110
$logoBoxX = 80
$logoBoxY = 60

# White backing card for logo
$logoCardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$gPrev.FillRectangle($logoCardBrush, $logoBoxX, $logoBoxY, $logoBoxW, $logoBoxH)
$gPrev.DrawRectangle((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 234, 179, 8), 3)), $logoBoxX, $logoBoxY, $logoBoxW, $logoBoxH)

$logoDrawW = [int](96 * ($cropW / $cropH))
$logoDrawH = 96
$logoDrawX = $logoBoxX + [int](($logoBoxW - $logoDrawW) / 2)
$logoDrawY = $logoBoxY + [int](($logoBoxH - $logoDrawH) / 2)
$logoDestRect = New-Object System.Drawing.Rectangle($logoDrawX, $logoDrawY, $logoDrawW, $logoDrawH)
$gPrev.DrawImage($srcBmp, $logoDestRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

# Badge next to logo
$pillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 234, 179, 8))
$gPrev.FillRectangle($pillBrush, 210, 65, 250, 32)
$fontBadge = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
$brushDark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
$gPrev.DrawString("LARAVEL 11 + REACT 19", $fontBadge, $brushDark, 222, 72)

# Title
$fontTitle = New-Object System.Drawing.Font("Arial", 38, [System.Drawing.FontStyle]::Bold)
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$gPrev.DrawString("APEX INFRA", $fontTitle, $brushWhite, 205, 105)

# Subtitle
$fontSub = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Bold)
$brushGoldLight = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 204, 21))
$gPrev.DrawString("Real Estate & Construction ERP", $fontSub, $brushGoldLight, 80, 200)

# Feature Highlights
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

$yPos = 270
foreach ($b in $bullets) {
    $gPrev.FillEllipse($brushGoldLight, 85, $yPos + 5, 8, 8)
    $gPrev.DrawString($b, $fontBullets, $brushLightGray, 105, $yPos)
    $yPos += 45
}

# Footer badges
$fontFooter = New-Object System.Drawing.Font("Arial", 13, [System.Drawing.FontStyle]::Bold)
$gPrev.DrawString("PHP 8.2+  |  TypeScript  |  MySQL & SQLite  |  Rest API", $fontFooter, $brushGoldLight, 80, 710)

$prevSavePath = Join-Path $outDir "preview.png"
$prevBmp.Save($prevSavePath, [System.Drawing.Imaging.ImageFormat]::Png)
$gPrev.Dispose()
$prevBmp.Dispose()
$srcBmp.Dispose()

Write-Host "Saved: $prevSavePath (1600x800)"
Write-Host "=== APEX INFRA BRANDING APPLIED! ==="

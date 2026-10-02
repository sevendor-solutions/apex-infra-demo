Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = "C:\Users\Dhora\Desktop\Sevendor\Currently Working\Apex infra"
$outDir = Join-Path $baseDir "codester_assets"
$tempDir = Join-Path $baseDir "clean_screenshots_temp"
$logoPath = Join-Path $baseDir "backend\public\uploads\branding\apex_infra_logo.jpg"
$uploadedDir = "C:\Users\Dhora\.gemini\antigravity\brain\a41f25b9-df64-45bd-abc9-dbcccc652e48\.user_uploaded"

if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Load Apex Logo
$srcLogo = [System.Drawing.Bitmap]::FromFile($logoPath)
$cropX = 450
$cropY = 80
$cropW = 465
$cropH = 615
$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)

function Clean-And-Brand-Screenshot($srcFile, $outFile, $isWallet = $false) {
    if (-not (Test-Path $srcFile)) { return }
    $bmp = [System.Drawing.Bitmap]::FromFile($srcFile)
    
    # 1. Crop off the browser address bar (top 19 px)
    $cropTop = 19
    $cleanH = $bmp.Height - $cropTop
    $cleanW = $bmp.Width
    $destBmp = New-Object System.Drawing.Bitmap($cleanW, $cleanH)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Draw cropped image
    $srcCropRect = New-Object System.Drawing.Rectangle(0, $cropTop, $cleanW, $cleanH)
    $destFullRect = New-Object System.Drawing.Rectangle(0, 0, $cleanW, $cleanH)
    $g.DrawImage($bmp, $destFullRect, $srcCropRect, [System.Drawing.GraphicsUnit]::Pixel)
    
    # 2. Overwrite the top-left logo area (X: 12..148, Y: 0..38)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($whiteBrush, 12, 1, 136, 37)
    
    # Draw Apex Infra logo inside the white box
    $logoDestRect = New-Object System.Drawing.Rectangle(15, 3, 32, 33)
    $g.DrawImage($srcLogo, $logoDestRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
    
    # Draw "APEX INFRA" text next to mark
    $fontLogo = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $brushNavy = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $g.DrawString("APEX INFRA", $fontLogo, $brushNavy, 48, 11)
    
    # 3. Clean any toast popup in the top bar (X: 450..850, Y: 0..38)
    # Fill with exact top bar dark blue: R=15, G=43, B=70 (#0f2b46)
    $topBarBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 43, 70))
    $g.FillRectangle($topBarBrush, 450, 0, 400, 38)
    
    # 4. If Wallet screenshot: patch the table row containing "JK FUTURE INFRA SBI"
    if ($isWallet) {
        $rowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillRectangle($rowBrush, 470, 260, 160, 24)
        $fontRow = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Regular)
        $brushRowText = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 51, 65, 85))
        $g.DrawString("APEX INFRA SBI BANK", $fontRow, $brushRowText, 470, 264)
    }
    
    $destBmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $destBmp.Dispose()
    $bmp.Dispose()
    Write-Host "Processed: $outFile"
}

# Process the admin screenshots
Clean-And-Brand-Screenshot (Join-Path $uploadedDir "media_1790242779101.png") (Join-Path $tempDir "02_Admin_Dashboard_Overview.png") $false
Clean-And-Brand-Screenshot (Join-Path $uploadedDir "media_1790243348839.png") (Join-Path $tempDir "03_Daily_Agenda_Matrix.png") $true
Clean-And-Brand-Screenshot (Join-Path $uploadedDir "media_1790317328978.png") (Join-Path $tempDir "04_Company_Branding_Profile.png") $false
Clean-And-Brand-Screenshot (Join-Path $uploadedDir "media_1790323546126.png") (Join-Path $tempDir "05_Financial_Accounting_Ledger.png") $false
Clean-And-Brand-Screenshot (Join-Path $uploadedDir "media_1790324156505.png") (Join-Path $tempDir "06_Admin_Multi_Tab_Workspace.png") $false

# Add the high-res homepage and marketing banners
if (Test-Path (Join-Path $baseDir "clean_screenshots_temp\01_Apex_Infra_Homepage.png")) {
    Copy-Item (Join-Path $baseDir "clean_screenshots_temp\01_Apex_Infra_Homepage.png") (Join-Path $tempDir "01_Apex_Infra_Homepage.png")
} elseif (Test-Path (Join-Path $baseDir "frontend\dist\cta_banner_hd.png")) {
    Copy-Item (Join-Path $baseDir "frontend\dist\cta_banner_hd.png") (Join-Path $tempDir "01_Apex_Infra_Showcase.png")
}

if (Test-Path (Join-Path $baseDir "frontend\dist\marketing_banner_hd.png")) {
    Copy-Item (Join-Path $baseDir "frontend\dist\marketing_banner_hd.png") (Join-Path $tempDir "07_Marketing_Projects_Gallery.png")
}

$srcLogo.Dispose()

# Package into codester_assets/screenshots.zip
$zipScreen = Join-Path $outDir "screenshots.zip"
if (Test-Path $zipScreen) { Remove-Item -Force $zipScreen }

Write-Host "Creating clean screenshots.zip..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipScreen, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Remove-Item -Recurse -Force $tempDir
Write-Host "=== SCREENSHOTS.ZIP UPDATED WITH 100% APEX INFRA BRANDING! ==="
Get-Item $zipScreen | Select-Object Name, Length, LastWriteTime

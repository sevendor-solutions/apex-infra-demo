Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = "C:\Users\Dhora\Desktop\Sevendor\Currently Working\Apex infra"
$outDir = Join-Path $baseDir "codester_assets"
$tempDir = Join-Path $baseDir "clean_screenshots_temp"
$logoPath = Join-Path $baseDir "backend\public\uploads\branding\apex_infra_logo.jpg"

if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# 1. Start PHP server for frontend dist
Write-Host "Starting local preview server on port 8089..."
$phpProc = Start-Process "C:\Users\Dhora\php\php.exe" -ArgumentList "-S 127.0.0.1:8089 -t `"frontend\dist`"" -PassThru
Start-Sleep -Seconds 2

# 2. Capture live pages
$livePages = @(
    @{ Url = "http://127.0.0.1:8089/"; Out = "01_Apex_Infra_Homepage.png" },
    @{ Url = "http://127.0.0.1:8089/projects"; Out = "02_Properties_Showcase.png" },
    @{ Url = "http://127.0.0.1:8089/marketing"; Out = "03_Land_Plotting_Marketing.png" },
    @{ Url = "http://127.0.0.1:8089/careers"; Out = "04_Careers_Applicant_Portal.png" },
    @{ Url = "http://127.0.0.1:8089/contact"; Out = "05_Site_Visit_Booking.png" },
    @{ Url = "http://127.0.0.1:8089/admin"; Out = "06_Admin_Login_Portal.png" }
)

foreach ($lp in $livePages) {
    $dest = Join-Path $tempDir $lp.Out
    Write-Host "Capturing $($lp.Url) -> $($lp.Out)"
    Start-Process $edge -ArgumentList "--headless=new", "--disable-gpu", "--window-size=1600,1000", "--virtual-time-budget=3000", "--screenshot=`"$dest`"", $lp.Url -Wait
}

Stop-Process -Id $phpProc.Id -Force
Write-Host "Live captures completed."

# 3. Load Apex Logo for stamping onto Admin screenshots
$srcLogo = [System.Drawing.Bitmap]::FromFile($logoPath)
$cropX = 450
$cropY = 80
$cropW = 465
$cropH = 615
$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)

# Function to patch admin screenshots
function Patch-AdminScreenshot($srcFile, $outFile, $isWalletScreen = $false) {
    if (-not (Test-Path $srcFile)) { return }
    $bmp = [System.Drawing.Bitmap]::FromFile($srcFile)
    
    # Crop out browser address bar (top 32 px)
    $cleanH = $bmp.Height - 32
    $cleanW = $bmp.Width
    $destBmp = New-Object System.Drawing.Bitmap($cleanW, $cleanH)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Draw cropped image
    $srcCropRect = New-Object System.Drawing.Rectangle(0, 32, $cleanW, $cleanH)
    $destFullRect = New-Object System.Drawing.Rectangle(0, 0, $cleanW, $cleanH)
    $g.DrawImage($bmp, $destFullRect, $srcCropRect, [System.Drawing.GraphicsUnit]::Pixel)
    
    # The logo box is at X: 5..145, Y: 2..48
    # Fill white backing for Apex logo
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($whiteBrush, 5, 2, 140, 46)
    
    # Stamp Apex Infra logo inside
    $logoTargetRect = New-Object System.Drawing.Rectangle(8, 4, 38, 42)
    $g.DrawImage($srcLogo, $logoTargetRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
    
    # Text next to logo: "APEX INFRA"
    $fontLogo = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
    $brushDarkNavy = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $g.DrawString("APEX INFRA", $fontLogo, $brushDarkNavy, 48, 17)
    
    # Hide green toast notification in top bar (Y: 2..48, X: 480..820)
    # Fill with top bar dark navy: #0f2b46 (RGB: 15, 43, 70)
    $topBarBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 43, 70))
    $g.FillRectangle($topBarBrush, 480, 2, 340, 46)
    
    # If wallet screen: replace "JK FUTURE INFRA SBI" row
    if ($isWalletScreen) {
        $rowBgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
        $g.FillRectangle($rowBgBrush, 470, 250, 150, 20)
        $fontRow = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Regular)
        $brushRow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 51, 65, 85))
        $g.DrawString("APEX INFRA SBI BANK", $fontRow, $brushRow, 470, 252)
    }
    
    $destBmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $destBmp.Dispose()
    $bmp.Dispose()
    Write-Host "Patched: $outFile"
}

# 4. Patch the 4 key Admin screenshots
$uploadedDir = "C:\Users\Dhora\.gemini\antigravity\brain\a41f25b9-df64-45bd-abc9-dbcccc652e48\.user_uploaded"

Patch-AdminScreenshot (Join-Path $uploadedDir "media_1790242779101.png") (Join-Path $tempDir "07_Admin_Dashboard_Overview.png") $false
Patch-AdminScreenshot (Join-Path $uploadedDir "media_1790243348839.png") (Join-Path $tempDir "08_Admin_Wallets_And_Banking.png") $true
Patch-AdminScreenshot (Join-Path $uploadedDir "media_1790323546126.png") (Join-Path $tempDir "09_Admin_Financial_Accounting.png") $false
Patch-AdminScreenshot (Join-Path $uploadedDir "media_1790317328978.png") (Join-Path $tempDir "10_Admin_Company_Branding.png") $false

$srcLogo.Dispose()

# 5. Package into codester_assets/screenshots.zip
$zipScreen = Join-Path $outDir "screenshots.zip"
if (Test-Path $zipScreen) { Remove-Item -Force $zipScreen }

Write-Host "Compressing 10 clean screenshots into $zipScreen ..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipScreen, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Remove-Item -Recurse -Force $tempDir
Remove-Item -Force (Join-Path $baseDir "test_screen.png") -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $baseDir "home_screen.png") -ErrorAction SilentlyContinue

Write-Host "=== SCREENSHOTS.ZIP REBUILT WITH 100% APEX INFRA BRANDING! ==="
Get-Item $zipScreen | Select-Object Name, Length

# ToonBlast — Android APK builder
# Run: Right-click -> "Run with PowerShell"  (or: powershell -File build-android.ps1)

$ErrorActionPreference = "Stop"

$ProjectRoot  = $PSScriptRoot
$JAVA_HOME    = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

Write-Host ""
Write-Host "=== ToonBlast - building for Android ===" -ForegroundColor Cyan

# 1. Web build (Capacitor mode - no singlefile, relative base path)
Write-Host ""
Write-Host "[1/3] Building web assets..." -ForegroundColor Yellow
Set-Location $ProjectRoot
$env:JAVA_HOME    = $JAVA_HOME
$env:ANDROID_HOME = $ANDROID_HOME
npx vite build --mode android
if ($LASTEXITCODE -ne 0) { throw "Vite build failed" }

# 2. Copy to Android project
Write-Host ""
Write-Host "[2/3] Copying to Android project..." -ForegroundColor Yellow
npx cap copy android
if ($LASTEXITCODE -ne 0) { throw "Capacitor copy failed" }

# 3. Build APK
Write-Host ""
Write-Host "[3/3] Building APK with Gradle..." -ForegroundColor Yellow
Set-Location "$ProjectRoot\android"
.\gradlew assembleDebug
if ($LASTEXITCODE -ne 0) { throw "Gradle build failed" }

# Copy APK to project root for easy access
$apkSrc  = "$ProjectRoot\android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = "$ProjectRoot\ToonBlast.apk"
Copy-Item $apkSrc $apkDest -Force

$sizeMB = [math]::Round((Get-Item $apkDest).Length / 1MB, 1)

Write-Host ""
Write-Host "=== DONE! ===" -ForegroundColor Green
Write-Host "APK saved to: $apkDest" -ForegroundColor Green
Write-Host "Size: $sizeMB MB" -ForegroundColor Green
Write-Host ""

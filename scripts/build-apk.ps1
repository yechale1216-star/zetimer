# Zetime APK Build Script
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "[1/5] Hiding app/api..."
$apiDir = Join-Path $root "app\api"
$apiDirBak = Join-Path $root "app\_api_bak"

if (Test-Path $apiDir) {
    Rename-Item -Path $apiDir -NewName "_api_bak"
}

try {
    Write-Host "Clearing Next.js cache..."
    if (Test-Path (Join-Path $root ".next")) {
        Remove-Item -Recurse -Force (Join-Path $root ".next")
    }

    Write-Host "[2/5] Building Next.js..."
    $env:CAPACITOR_BUILD = "1"
    Set-Location $root
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }

    Write-Host "[3/5] Syncing Capacitor..."
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw "Cap sync failed" }
} finally {
    Write-Host "Restoring app/api..."
    if (Test-Path $apiDirBak) {
        Rename-Item -Path $apiDirBak -NewName "api"
    }
    $env:CAPACITOR_BUILD = ""
}

Write-Host "[4/5] Gradle Build..."
$androidDir = Join-Path $root "android"
Set-Location $androidDir

# Self-heal Java path using Android Studio's bundled JBR if needed
if (-not $env:JAVA_HOME -and (Test-Path "C:\Program Files\Android\Android Studio\jbr")) {
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
    Write-Host "Set JAVA_HOME to Android Studio bundled JDK: $env:JAVA_HOME"
}

.\gradlew.bat assembleDebug

# Find the APK
$apk = Get-ChildItem -Path "$androidDir\app\build\outputs\apk\debug" -Filter "*.apk" | Select-Object -First 1
Write-Host "✅ APK ready at: $($apk.FullName)"

# Install if adb device connected
$devices = & adb devices | Select-String "device$"
if ($devices) {
    Write-Host "Installing to device..."
    & adb install -r $apk.FullName
} else {
    Write-Host "Install manually with:"
    Write-Host "adb install -r `"$($apk.FullName)`""
}

Set-Location $root

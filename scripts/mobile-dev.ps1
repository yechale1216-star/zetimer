# Zetime Mobile Development Helper Script
# This script helps with ADB port forwarding for USB testing.

function Check-ADB {
    try {
        $version = adb version
        Write-Host "✅ ADB found" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ ADB not found! Please install Android Platform Tools and add it to your PATH." -ForegroundColor Red
        Write-Host "Download from: https://developer.android.com/studio/releases/platform-tools"
        return $false
    }
}

function List-Devices {
    Write-Host "Searching for connected Android devices..."
    $devices = adb devices
    $deviceCount = ($devices | Where-Object { $_ -match "\tdevice$" }).Count
    
    if ($deviceCount -eq 0) {
        Write-Host "❌ No devices detected. Please check USB connection and 'USB Debugging' settings." -ForegroundColor Yellow
        $devices
        return $false
    } else {
        Write-Host "✅ Detected $deviceCount device(s)." -ForegroundColor Green
        $devices
        return $true
    }
}

function Setup-Forwarding {
    Write-Host "Setting up port forwarding..."
    
    # Forward Frontend (Next.js)
    Write-Host "Forwarding port 3000 (Frontend)..."
    adb reverse tcp:3000 tcp:3000
    
    # Forward Backend (Express)
    Write-Host "Forwarding port 5000 (Backend)..."
    adb reverse tcp:5000 tcp:5000
    
    Write-Host "✅ Setup Complete!" -ForegroundColor Green
    Write-Host "`nOpen http://localhost:3000 on your Android phone browser." -ForegroundColor Cyan
}

# Main Execution
Clear-Host
Write-Host "=== Zetime USB Testing Setup ===" -ForegroundColor Blue

if (Check-ADB) {
    if (List-Devices) {
        Setup-Forwarding
    }
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

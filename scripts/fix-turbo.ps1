# fix-turbo.ps1
# Script to forcefully clear all Next.js and Turbopack caches

Write-Host "--- AGGRESSIVE CACHE CLEAR ---" -ForegroundColor Cyan

Write-Host "Killing all Node and Next.js processes..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.Name -eq "node" -or $_.Name -eq "next" }
if ($processes) {
    $processes | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Functions to handle locked directories
function Force-Delete-Directory($path) {
    if (Test-Path $path) {
        Write-Host "Attempting to remove $path..." -ForegroundColor Cyan
        try {
            # Try renaming first (often works when deletion is locked)
            $oldPath = $path + "_old_" + (Get-Date -Format "yyyyMMddHHmmss")
            Rename-Item -Path $path -NewName $oldPath -ErrorAction Stop
            Remove-Item -Path $oldPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "Successfully removed $path" -ForegroundColor Green
        } catch {
            Write-Host "Failed to remove $path directly. Trying individual file deletion..." -ForegroundColor Yellow
            Get-ChildItem -Path $path -Recurse | ForEach-Object {
                Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
            }
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Force-Delete-Directory ".next"
Force-Delete-Directory ".next_dev"
Force-Delete-Directory ".next_dev_v2"
Force-Delete-Directory "node_modules/.cache/turbo"

Write-Host "--- ALL CACHES CLEARED ---" -ForegroundColor Green
Write-Host "You can now run 'npm run dev' safely." -ForegroundColor Green

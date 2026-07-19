param([switch]$NoBuild)

$root = $PSScriptRoot

Write-Host "=== 1. Backend ===" -ForegroundColor Cyan
$jb = Start-Job -ScriptBlock {
    param($d) ; Set-Location $d
    & ".\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList "$root\backend"
Start-Sleep 4

Write-Host "=== 2. adb reverse (USB) ===" -ForegroundColor Cyan
$dev = & adb devices
if ($dev -match "(?m)^[a-f0-9]+\s+device$") {
    & adb reverse tcp:8000 tcp:8000
    Write-Host "  OK" -ForegroundColor Green
} else {
    Write-Host "  [AVISO] Conecta el celular por USB y acepta 'Allow USB debugging'" -ForegroundColor Yellow
}

Write-Host "=== 3. Expo ===" -ForegroundColor Cyan
Set-Location "$root\mobile"
npx expo run:android

# Quick local setup check for Book Buddy
Write-Host "Book Buddy setup check" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "FAIL: Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
  exit 1
}
Write-Host "OK: Node $(node -v)" -ForegroundColor Green

if (-not (Test-Path ".env.local")) {
  Write-Host "FAIL: .env.local missing. Copy from .env.example" -ForegroundColor Red
  exit 1
}
Write-Host "OK: .env.local exists" -ForegroundColor Green

if (-not (Test-Path "node_modules")) {
  Write-Host "WARN: Run npm install" -ForegroundColor Yellow
} else {
  Write-Host "OK: node_modules present" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run Supabase SQL migrations (see docs/RUN_AND_BETA.md)"
Write-Host "  2. npm run dev"
Write-Host "  3. Open http://localhost:3000/api/health"

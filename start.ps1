# ==========================================================
# AMATIS - Rasha Amatis Employee Performance Management System
# ==========================================================
# This script sets up and runs the entire system.

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   AMATIS - Rasha Amatis Setup & Run" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Set-Location -Path "E:\rasha"

# 1. Start infrastructure (PostgreSQL + Redis + MinIO)
Write-Host "`n[1/5] Starting Docker infrastructure (PostgreSQL, Redis, MinIO)..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker failed. Make sure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

# Wait for postgres to be healthy
Write-Host "Waiting for PostgreSQL to be ready..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $status = docker inspect --format '{{.State.Health.Status}}' amatis-postgres 2>$null
    if ($status -eq "healthy") { $ready = $true; break }
}
if (-not $ready) {
    Write-Host "ERROR: PostgreSQL did not become healthy." -ForegroundColor Red
    exit 1
}
Write-Host "PostgreSQL is healthy." -ForegroundColor Green

# 2. Build shared packages (workspace deps)
Write-Host "`n[2/5] Building workspace packages (types, shared)..." -ForegroundColor Yellow
npm run build --workspace=@amatis/types
npm run build --workspace=@amatis/shared

# 3. Database migration
# 3. Database migration
Write-Host "`n[3/5] Applying database migrations..." -ForegroundColor Yellow

Push-Location "E:\rasha\apps\api"
npx prisma migrate deploy
$prismaExitCode = $LASTEXITCODE
Pop-Location

if ($prismaExitCode -ne 0) {
    Write-Host "ERROR: Migration failed." -ForegroundColor Red
    exit 1
}


# Write-Host "`n[3/5] Applying database migrations..." -ForegroundColor Yellow
# npx prisma migrate deploy --schema "apps/api/prisma/schema.prisma"
# if ($LASTEXITCODE -ne 0) {
#     Write-Host "ERROR: Migration failed." -ForegroundColor Red
#     exit 1
# }

# 4. Seed demo data (idempotent - safe to run multiple times)
Write-Host "`n[4/5] Seeding demo data..." -ForegroundColor Yellow
npm run db:seed --workspace=@amatis/api

# 5. Start dev servers
Write-Host "`n[5/5] Starting development servers..." -ForegroundColor Yellow
Write-Host "  Web:  http://localhost:3000" -ForegroundColor Green
Write-Host "  API:  http://localhost:4000" -ForegroundColor Green
Write-Host "  Swagger: http://localhost:4000/api/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Accounts:" -ForegroundColor Cyan
Write-Host "  Admin:      09120000001 / Admin@123456" -ForegroundColor White
Write-Host "  Executive:  09120000002 / Executive@123456" -ForegroundColor White
Write-Host "  Supervisor: 09120000003 / Supervisor@123456" -ForegroundColor White
Write-Host "  Employee:   09120000004 / Employee@123456" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Gray

npm run dev

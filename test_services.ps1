# ClearClaim Services Health Check
# Tests all backend APIs, agents, and database connectivity

Write-Host "`n=== CLEARCLAIM SERVICES HEALTH CHECK ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

# Test 1: ReadAPI (Port 5234)
Write-Host "[1/5] Testing ReadAPI (Port 5234)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:5234/api/InsuranceplanRead" -Method Get -TimeoutSec 5
    if ($response.records.Count -gt 0) {
        Write-Host "  [OK] ReadAPI is UP - Found $($response.records.Count) insurance plans" -ForegroundColor Green
        Write-Host "    Plans: $($response.records.planName -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "  [WARN] ReadAPI is UP but no plans found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [FAIL] ReadAPI is DOWN or not responding" -ForegroundColor Red
}

# Test 2: WriteAPI (Port 5130)
Write-Host "`n[2/5] Testing WriteAPI (Port 5130)..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:5130" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
    Write-Host "  [OK] WriteAPI is UP" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "  [OK] WriteAPI is UP (404 is expected for root endpoint)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] WriteAPI is DOWN or not responding" -ForegroundColor Red
    }
}

# Test 3: Agents Gateway (Port 8000)
Write-Host "`n[3/5] Testing Agents Gateway & Status (Port 8000)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/agent/status" -Method Get -TimeoutSec 5
    Write-Host "  [OK] Agents Gateway is UP" -ForegroundColor Green
    Write-Host "    Status: $($response.status)" -ForegroundColor Gray
    Write-Host "    Agents: $($response.agents.Keys -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "  [FAIL] Agents Gateway is DOWN or not responding" -ForegroundColor Red
}

# Test 4: Blockchain Connectivity (X Layer)
Write-Host "`n[4/5] Testing Blockchain Network Status..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/agent/status" -Method Get -TimeoutSec 5
    if ($response.blockchain) {
        Write-Host "  [OK] Blockchain configuration linked: $($response.blockchain)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Blockchain configuration is missing" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [FAIL] Failed to contact gateway for blockchain details" -ForegroundColor Red
}

# Test 5: Frontend Check (Vite - Port 5173)
Write-Host "`n[5/5] Testing Frontend (Port 5173)..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri "http://[::1]:5173" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
    Write-Host "  [OK] Frontend is UP and responding (http://[::1]:5173)" -ForegroundColor Green
} catch {
    # Fallback to port 5174
    try {
        $null = Invoke-WebRequest -Uri "http://[::1]:5174" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
        Write-Host "  [OK] Frontend is UP on port 5174 (http://[::1]:5174)" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] Frontend is DOWN or not responding" -ForegroundColor Red
    }
}

Write-Host "`n=== HEALTH CHECK COMPLETE ===" -ForegroundColor Cyan
Write-Host "`nTo start services manually:" -ForegroundColor Gray
Write-Host "  ReadAPI:  cd Medical-Insurance\Com.Application.Domain.ReadAPI && dotnet run" -ForegroundColor DarkGray
Write-Host "  WriteAPI: cd Medical-Insurance\Com.Application.Domain.WriteAPI && dotnet run" -ForegroundColor DarkGray
Write-Host "  Agents:   cd agents && .\venv\Scripts\python.exe main.py" -ForegroundColor DarkGray
Write-Host "  Frontend: cd clearclaim-frontend && npm run dev`n" -ForegroundColor DarkGray

#!/usr/bin/env pwsh

$baseUrl = 'http://localhost:5000/api'
$tests = @()

function Test {
  param([string]$name, [scriptblock]$block)
  try {
    & $block
    $tests += @{name=$name; passed=$true; error=$null}
    Write-Host "[PASS] $name" -ForegroundColor Green
    return $true
  } catch {
    $tests += @{name=$name; passed=$false; error=$_.Exception.Message}
    Write-Host "[FAIL] $name" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
    return $false
  }
}

Write-Host "`n====== END-TO-END TEST SUITE - REVORA ======`n" -ForegroundColor Cyan

# Reset stale test data to keep the suite reproducible.
try {
  & node -e "const db = require('./backend/src/config/db'); const Experiment = require('./backend/src/models/Experiment'); const Order = require('./backend/src/models/Order'); (async () => { await db(); await Experiment.deleteMany({}); await Order.deleteMany({ source: 'experiment' }); console.log('Reset test data'); process.exit(0); })().catch((err) => { console.error(err); process.exit(1); });"
} catch {
  Write-Host "  Warning: could not reset database automatically." -ForegroundColor Yellow
}

# Test 1: Health Check
Test "Health Check" {
  $r = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if (-not $r.success) { throw "Health check failed" }
}

# Test 2: Create Session
$token = $null
Test "Create Test Session" {
  $r = Invoke-WebRequest -Uri "$baseUrl/auth/test-session" -Method Post -Headers @{'Content-Type'='application/json'} -Body '{}' -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if (-not $r.data.token) { throw "No token received" }
  $global:token = $r.data.token
}

# Test 3: Get Current User
Test "Get Current User (Auth Verify)" {
  $r = Invoke-WebRequest -Uri "$baseUrl/auth/me" -Headers @{Authorization="Bearer $token"} -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if (-not $r.data.mode) { throw "Failed to get user info" }
}

# Test 4: Discover Best Opportunity
$opportunity = $null
Test "Discover Best Opportunity" {
  $r = Invoke-WebRequest -Uri "$baseUrl/opportunities" -Headers @{Authorization="Bearer $token"} -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if (-not $r.data.opportunity) { throw "No opportunity found" }
  $global:opportunity = $r.data.opportunity
  Write-Host "    Opportunity: $($opportunity.baseProductName) to $($opportunity.relatedProductName), Affinity: $($opportunity.affinity)" -ForegroundColor Cyan
}

# Test 5: List Multiple Opportunities
Test "List Top Opportunities (5)" {
  $r = Invoke-WebRequest -Uri "$baseUrl/opportunities/list?limit=5" -Headers @{Authorization="Bearer $token"} -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if ($r.data.opportunities.Count -eq 0) { throw "No opportunities in list" }
  Write-Host "    Found: $($r.data.opportunities.Count) opportunities" -ForegroundColor Cyan
}

# Test 6: Get AI Recommendation
Test "Generate AI Recommendation" {
  $body = $opportunity | ConvertTo-Json -Depth 5
  $r = Invoke-WebRequest -Uri "$baseUrl/opportunities/recommend" -Method Post -Headers @{Authorization="Bearer $token"; 'Content-Type'='application/json'} -Body $body -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if ($r.data.aiAvailable -eq $false) { throw "AI not available" }
}

# Test 7: Propose Experiment
$experiment = $null
Test "Propose Experiment with Guardrails" {
  $body = @{opportunity=$opportunity} | ConvertTo-Json -Depth 5
  $r = Invoke-WebRequest -Uri "$baseUrl/experiments/propose" -Method Post -Headers @{Authorization="Bearer $token"; 'Content-Type'='application/json'} -Body $body -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if (-not $r.data.experiment.id) { throw "Experiment not created" }
  $global:experiment = $r.data.experiment
  $passed = @($r.data.guardrails.checks | Where-Object {$_.passed}).Count
  $total = @($r.data.guardrails.checks).Count
  Write-Host "    Guardrails: $passed/$total checks passed, Control: $($experiment.controlCustomerIds.Count), Treatment: $($experiment.treatmentCustomerIds.Count)" -ForegroundColor Cyan
}

# Test 8: Get Experiment Details
Test "Get Experiment Details" {
  $r = Invoke-WebRequest -Uri "$baseUrl/experiments/$($experiment.id)" -Headers @{Authorization="Bearer $token"} -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if (-not $r.data.id) { throw "Failed to get experiment" }
}

# Test 9: Start Experiment
Test "Start Experiment" {
  $r = Invoke-WebRequest -Uri "$baseUrl/experiments/$($experiment.id)/start" -Method Post -Headers @{Authorization="Bearer $token"; 'Content-Type'='application/json'} -Body '{}' -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if ($r.data.status -ne "running") { throw "Experiment not in running state" }
  Write-Host "    Status: $($r.data.status)" -ForegroundColor Cyan
}

# Test 10a: Create test paid orders for experiment completion
Test "Create Test Orders for Experiment" {
  # Get control and treatment customer IDs
  $controlId = $experiment.controlCustomerIds[0]
  $treatmentId = $experiment.treatmentCustomerIds[0]
  
  if (-not $controlId -or -not $treatmentId) {
    throw "Missing control or treatment customer IDs"
  }
  
  # Create control group order
  $controlOrder = @{
    customerId = $controlId
    productIds = @($opportunity.baseProductId)
    amount = 1000
    status = "paid"
    experimentId = $experiment.id
    experimentGroup = "control"
    source = "experiment"
  } | ConvertTo-Json -Depth 3
  
  $controlResp = Invoke-WebRequest -Uri "$baseUrl/payments/test-order" -Method Post -Headers @{Authorization="Bearer $token"; 'Content-Type'='application/json'} -Body $controlOrder -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if (-not $controlResp.data.orderId) { throw "Failed to create control order" }
  
  # Create treatment group order
  $treatmentOrder = @{
    customerId = $treatmentId
    productIds = @($opportunity.baseProductId, $opportunity.relatedProductId)
    amount = 2000
    status = "paid"
    experimentId = $experiment.id
    experimentGroup = "treatment"
    source = "experiment"
  } | ConvertTo-Json -Depth 3
  
  $treatmentResp = Invoke-WebRequest -Uri "$baseUrl/payments/test-order" -Method Post -Headers @{Authorization="Bearer $token"; 'Content-Type'='application/json'} -Body $treatmentOrder -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if (-not $treatmentResp.data.orderId) { throw "Failed to create treatment order" }
}

# Test 10: Complete Experiment
Test "Complete Experiment" {
  $r = Invoke-WebRequest -Uri "$baseUrl/experiments/$($experiment.id)/complete" -Method Post -Headers @{Authorization="Bearer $token"; 'Content-Type'='application/json'} -Body '{}' -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if ($r.data.status -ne "completed") { throw "Experiment not completed" }
  Write-Host "    Final Status: $($r.data.status), Decision: $($r.data.decision)" -ForegroundColor Cyan
}

# Test 11: Verify Results
Test "Verify Experiment Results" {
  $r = Invoke-WebRequest -Uri "$baseUrl/experiments/$($experiment.id)" -Headers @{Authorization="Bearer $token"} -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if (-not $r.data.results) { throw "No results available" }
}

# Test 12: Check Audit Logs
Test "Query Audit Logs" {
  $r = Invoke-WebRequest -Uri "$baseUrl/audit?limit=20" -Headers @{Authorization="Bearer $token"} -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
  if ($r.data.entries.Count -eq 0) { throw "No audit logs found" }
  Write-Host "    Audit entries: $($r.data.entries.Count)" -ForegroundColor Cyan
}

# Summary
Write-Host "`n====== TEST SUMMARY ======`n" -ForegroundColor Cyan

$passed = @($tests | Where-Object {$_.passed}).Count
$failed = @($tests | Where-Object {-not $_.passed}).Count
$total = $tests.Count

Write-Host "Total Tests:  $total" -ForegroundColor White
Write-Host "Passed:       $passed" -ForegroundColor Green
Write-Host "Failed:       $failed" -ForegroundColor $(if ($failed -eq 0) {"Green"} else {"Red"})

if ($failed -eq 0) {
  Write-Host "`nSUCCESS: ALL END-TO-END TESTS PASSED" -ForegroundColor Green
  Write-Host "The application is fully functional!" -ForegroundColor Green
} else {
  Write-Host "`nFAILURE: Some tests failed" -ForegroundColor Red
  $tests | Where-Object {-not $_.passed} | ForEach-Object {
    Write-Host "  [FAIL] $($_.name): $($_.error)" -ForegroundColor Red
  }
}

Write-Host ""

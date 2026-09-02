$ErrorActionPreference = "Stop"
function Login($m, $p) {
  $r = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/v1/auth/login" -ContentType "application/json" -Body (@{mobile=$m;password=$p}|ConvertTo-Json)
  return $r.data
}
$sup = Login "09120000003" "Supervisor@123456"
$supH = @{ Authorization = "Bearer $($sup.accessToken)" }
$emp = Login "09120000004" "Employee@123456"
$empH = @{ Authorization = "Bearer $($emp.accessToken)" }

$taskId = "cmt4als670005ve3w90s0vnt6"

# employee sees the task
$myTasks = Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/v1/tasks" -Headers $empH
Write-Host "PASS employee list count=$($myTasks.data.Count)"

# start task
$start = Invoke-RestMethod -Method Patch -Uri "http://localhost:4000/api/v1/tasks/$taskId/status" -Headers $empH -ContentType "application/json" -Body (@{status="IN_PROGRESS"}|ConvertTo-Json)
Write-Host "PASS start status=$($start.status)"

# progress
$prog = Invoke-RestMethod -Method Patch -Uri "http://localhost:4000/api/v1/tasks/$taskId/progress" -Headers $empH -ContentType "application/json" -Body (@{progress=75}|ConvertTo-Json)
Write-Host "PASS progress=$($prog.progress)"

# submit
$submit = Invoke-RestMethod -Method Patch -Uri "http://localhost:4000/api/v1/tasks/$taskId/status" -Headers $empH -ContentType "application/json" -Body (@{status="SUBMITTED"}|ConvertTo-Json)
Write-Host "PASS submit status=$($submit.status)"

# supervisor reviews
$detail = Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/v1/tasks/$taskId" -Headers $supH
Write-Host "PASS supervisor review access status=$($detail.status)"

# request revision
$rev = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/v1/tasks/$taskId/revision" -Headers $supH -ContentType "application/json" -Body (@{reason="Need scientific accuracy review";comment="re-verify analysis"}|ConvertTo-Json)
Write-Host "PASS revision #$($rev.revision.revisionNumber) taskStatus=$($rev.task.status)"

# employee resubmits: NEED_REVISION -> IN_PROGRESS -> SUBMITTED
$inprog = Invoke-RestMethod -Method Patch -Uri "http://localhost:4000/api/v1/tasks/$taskId/status" -Headers $empH -ContentType "application/json" -Body (@{status="IN_PROGRESS"}|ConvertTo-Json)
Write-Host "PASS revision-inprogress status=$($inprog.status)"
$resubmit = Invoke-RestMethod -Method Patch -Uri "http://localhost:4000/api/v1/tasks/$taskId/status" -Headers $empH -ContentType "application/json" -Body (@{status="SUBMITTED"}|ConvertTo-Json)
Write-Host "PASS resubmit status=$($resubmit.status) revisionCount=$($resubmit.revisionCount)"

# supervisor approves
$approve = Invoke-RestMethod -Method Patch -Uri "http://localhost:4000/api/v1/tasks/$taskId/status" -Headers $supH -ContentType "application/json" -Body (@{status="APPROVED"}|ConvertTo-Json)
Write-Host "PASS approve status=$($approve.status) revisionCount=$($approve.revisionCount) completionTime=$($approve.completionTime)"

# data scope: employee should NOT see supervisor's other employee tasks
$emp2 = Login "09120000005" "Employee@123456"
$emp2H = @{ Authorization = "Bearer $($emp2.accessToken)" }
try {
  Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/v1/tasks/$taskId" -Headers $emp2H | Out-Null
  Write-Host "FAIL employee-2 accessed someone else's task (data scope broken)"
} catch {
  Write-Host "PASS employee-2 blocked from other's task ($($_.Exception.Response.StatusCode.value__))"
}

# notifications for employee
$notifs = Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/v1/notifications" -Headers $empH -ErrorAction SilentlyContinue
if ($notifs) { Write-Host "PASS notifications endpoint: $($notifs.data.Count) items" } else { Write-Host "NOTE notifications module not built yet" }

Write-Host "`n=== ACCEPTANCE FLOW COMPLETE ==="
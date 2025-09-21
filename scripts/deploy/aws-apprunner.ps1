param(
  [string]$ServiceName = "career-mirror",
  [string]$Region = "ap-south-1",
  [string]$Repository = "career-mirror",
  [string]$ImageTag = "latest"
)

$ErrorActionPreference = 'Stop'

function Require-Env($name) {
  $val = [System.Environment]::GetEnvironmentVariable($name, 'Process')
  if ([string]::IsNullOrWhiteSpace($val)) {
    throw "Environment variable '$name' is required. Set it before running this script."
  }
}

Write-Host "[1/7] Validating prerequisites" -ForegroundColor Cyan
# Detect Supabase presence (optional)
$SUPABASE_URL = [System.Environment]::GetEnvironmentVariable('SUPABASE_URL','Process')
$SUPABASE_ANON_KEY = [System.Environment]::GetEnvironmentVariable('SUPABASE_ANON_KEY','Process')
$SUPABASE_SERVICE_ROLE_KEY = [System.Environment]::GetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY','Process')
$hasSupabase = -not [string]::IsNullOrWhiteSpace($SUPABASE_URL) -and -not [string]::IsNullOrWhiteSpace($SUPABASE_ANON_KEY)
if (-not $hasSupabase) { Write-Warning "SUPABASE_URL/ANON_KEY not set. Proceeding with local auth (no Supabase)." }

# Optional: run migrations if DATABASE_URL is present
if ($env:DATABASE_URL) {
  Write-Host "[2/7] Pushing DB schema to Supabase (drizzle-kit push)" -ForegroundColor Cyan
  npx drizzle-kit push | Write-Host
} else {
  Write-Warning "DATABASE_URL not set. Skipping migrations push."
}

Write-Host "[3/7] Building Docker image" -ForegroundColor Cyan
$buildArgs = @()
if ($hasSupabase) {
  $buildArgs += @("--build-arg", "VITE_SUPABASE_URL=$SUPABASE_URL", "--build-arg", "VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY")
}
& docker build -t "$($Repository):$($ImageTag)" @buildArgs .

Write-Host "[4/7] Creating/using ECR repo and pushing image" -ForegroundColor Cyan
$AccountId = (aws sts get-caller-identity --query Account --output text)
try {
  aws ecr describe-repositories --repository-names $Repository --region $Region | Out-Null
} catch {
  aws ecr create-repository --repository-name $Repository --region $Region | Out-Null
}

aws ecr get-login-password --region $Region `
  | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com" | Out-Null

$ImageUri = "$AccountId.dkr.ecr.$Region.amazonaws.com/$($Repository):$($ImageTag)"
docker tag "$($Repository):$($ImageTag)" $ImageUri
docker push $ImageUri

Write-Host "[5/7] Ensuring IAM role for App Runner ECR access" -ForegroundColor Cyan
$RoleName = "AppRunnerECRAccessRole"
$RoleArn = ""
try {
  $RoleArn = (aws iam get-role --role-name $RoleName --query 'Role.Arn' --output text)
} catch {
  Write-Host "Creating IAM role $RoleName"
  $trust = Get-Content -Raw -Path "$PSScriptRoot/apprunner-trust-policy.json"
  $RoleArn = (aws iam create-role --role-name $RoleName --assume-role-policy-document $trust --query 'Role.Arn' --output text)
  aws iam attach-role-policy --role-name $RoleName --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess | Out-Null
}

Write-Host "[6/7] Creating or updating App Runner service" -ForegroundColor Cyan
$exists = $false
try {
  $svc = aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$ServiceName'] | [0]" --output json
  if ($svc -and $svc -ne 'null' -and $svc.Trim().Length -gt 0) { $exists = $true }
} catch {}

# Build runtime env vars
$envList = @(
  @{ Name = 'NODE_ENV'; Value = 'production' }
)
if ($hasSupabase) {
  $envList += @(
    @{ Name = 'USE_SUPABASE_AUTH'; Value = 'true' },
    @{ Name = 'SUPABASE_URL'; Value = $SUPABASE_URL },
    @{ Name = 'SUPABASE_ANON_KEY'; Value = $SUPABASE_ANON_KEY }
  )
  if ($SUPABASE_SERVICE_ROLE_KEY) { $envList += @{ Name = 'SUPABASE_SERVICE_ROLE_KEY'; Value = $SUPABASE_SERVICE_ROLE_KEY } }
} else {
  $envList += @(
    @{ Name = 'USE_SUPABASE_AUTH'; Value = 'false' },
    @{ Name = 'ENABLE_LOCAL_AUTH'; Value = 'true' }
  )
}
if (-not $env:SESSION_SECRET) { $env:SESSION_SECRET = [Guid]::NewGuid().ToString('N') }
$envList += @{ Name = 'SESSION_SECRET'; Value = $env:SESSION_SECRET }
$envList += @{ Name = 'PORT'; Value = '5000' }

# Convert to AWS CLI inline JSON
$envJson = ($envList | ConvertTo-Json -Compress)

if (-not $exists) {
  Write-Host "Creating App Runner service $ServiceName"
  aws apprunner create-service `
    --service-name $ServiceName `
    --region $Region `
    --source-configuration "{\"ImageRepository\":{\"ImageIdentifier\":\"$ImageUri\",\"ImageRepositoryType\":\"ECR\",\"ImageConfiguration\":{\"Port\":\"5000\",\"RuntimeEnvironmentVariables\":$envJson}},\"ImageRepositoryCredentials\":{\"AccessRoleArn\":\"$RoleArn\"}}" `
    --instance-configuration "{\"Cpu\":\"1 vCPU\",\"Memory\":\"2 GB\"}" `
    --health-check-configuration "{\"Protocol\":\"HTTP\",\"Path\":\"/health\",\"Interval\":5,\"Timeout\":2,\"HealthyThreshold\":1,\"UnhealthyThreshold\":3}"
} else {
  Write-Host "Updating App Runner service $ServiceName"
  $arn = (aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$ServiceName'].ServiceArn | [0]" --output text)
  aws apprunner update-service `
    --service-arn $arn `
    --region $Region `
    --source-configuration "{\"ImageRepository\":{\"ImageIdentifier\":\"$ImageUri\",\"ImageRepositoryType\":\"ECR\",\"ImageConfiguration\":{\"Port\":\"5000\",\"RuntimeEnvironmentVariables\":$envJson}},\"ImageRepositoryCredentials\":{\"AccessRoleArn\":\"$RoleArn\"}}"
}

Write-Host "[7/7] Waiting for service to stabilize (this can take ~2-5 minutes)" -ForegroundColor Cyan
Start-Sleep -Seconds 10
$serviceArn = (aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$ServiceName'].ServiceArn | [0]" --output text)
$svcDesc = aws apprunner describe-service --service-arn $serviceArn --output json | ConvertFrom-Json
$defaultUrl = $svcDesc.Service.ServiceUrl
Write-Host "Service URL: $defaultUrl" -ForegroundColor Green
Write-Host "Done. If the URL 404s initially, wait a minute and retry /health." -ForegroundColor Yellow

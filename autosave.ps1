# ============================================================
# Twin Tracker — GitHub 자동 저장 스크립트
# 실행 시 변경사항 자동 commit & push
# ============================================================

function Write-Info($msg)    { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

$GITHUB_TOKEN = [System.Environment]::GetEnvironmentVariable("TWIN_TRACKER_TOKEN", "User")
if (-not $GITHUB_TOKEN) {
    Write-Warn "환경변수 TWIN_TRACKER_TOKEN이 설정되지 않았습니다."
    Write-Warn "powershell 에서 다음을 실행하세요:"
    Write-Warn '[System.Environment]::SetEnvironmentVariable("TWIN_TRACKER_TOKEN", "<토큰값>", "User")'
    exit 1
}
$GITHUB_USER  = "Biscuitttt"
$REPO_NAME    = "twin-tracker"
$REMOTE_URL   = "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location $ProjectDir

# git 명령어 경로 확인
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
$gitPath = if ($gitCmd) { $gitCmd.Source } else { $null }
if (-not $gitPath) {
    # winget으로 설치 후 경로 재탐색
    $gitPath = "C:\Program Files\Git\bin\git.exe"
    if (-not (Test-Path $gitPath)) {
        Write-Warn "Git이 설치되지 않았습니다. setup_env.ps1을 먼저 실행하세요."
        exit 1
    }
    $env:PATH += ";C:\Program Files\Git\bin;C:\Program Files\Git\cmd"
}

# ── Git 초기화 ────────────────────────────────────────────────
if (-not (Test-Path ".git")) {
    Write-Info "Git 초기화 중..."
    git init
    git config user.name  "$GITHUB_USER"
    git config user.email "${GITHUB_USER}@users.noreply.github.com"
    git remote add origin $REMOTE_URL
    Write-Success "Git 저장소 초기화 완료"
} else {
    # remote URL 업데이트 (토큰 포함)
    git remote set-url origin $REMOTE_URL
}

# ── 변경사항 확인 ─────────────────────────────────────────────
$status = git status --porcelain
if (-not $status) {
    Write-Info "변경사항 없음 — 저장 생략"
    exit 0
}

# ── commit & push ─────────────────────────────────────────────
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$commitMsg = "auto: $timestamp"

Write-Info "변경사항 저장 중: $commitMsg"
git add .
git commit -m $commitMsg

# 브랜치 확인
$branch = git rev-parse --abbrev-ref HEAD 2>&1
if ($branch -eq "HEAD" -or $branch -eq "") { $branch = "main" }

# push (최초엔 --set-upstream)
$pushResult = git push --set-upstream origin $branch 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "GitHub 저장 완료! → https://github.com/$GITHUB_USER/$REPO_NAME"
} else {
    Write-Warn "Push 실패: $pushResult"
    Write-Warn "레포지토리가 존재하는지 확인하세요: https://github.com/$GITHUB_USER/$REPO_NAME"
}

# ══════════════════════════════════════════════════════════════
#  R.A.G.E LAN 2 — Installation
#  Appelé par 1-INSTALLATION.bat. Ne pas lancer directement.
# ══════════════════════════════════════════════════════════════

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Step($n, $t) { Write-Host "`n  [$n] $t" -ForegroundColor Cyan }
function Ok($t)       { Write-Host "      $t" -ForegroundColor Green }
function Warn($t)     { Write-Host "      $t" -ForegroundColor Yellow }
function Die($t) {
  Write-Host "`n  [X] $t`n" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "  ===============================================" -ForegroundColor White
Write-Host "    R.A.G.E LAN 2  -  INSTALLATION" -ForegroundColor White
Write-Host "  ===============================================" -ForegroundColor White

# ── Node.js ───────────────────────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Die "Node.js est introuvable.`n      Installe la version LTS depuis https://nodejs.org puis relance."
}
Ok "Node.js $(node -v)"

# ── PostgreSQL ────────────────────────────────────────────────
$pgBin = @(17, 16, 15, 14, 13) |
  ForEach-Object { "C:\Program Files\PostgreSQL\$_\bin" } |
  Where-Object { Test-Path (Join-Path $_ 'psql.exe') } |
  Select-Object -First 1

if (-not $pgBin) {
  Die "PostgreSQL est introuvable dans C:\Program Files\PostgreSQL`n      Installe-le depuis https://www.postgresql.org/download/windows/"
}
$psql = Join-Path $pgBin 'psql.exe'
Ok "PostgreSQL trouve : $pgBin"

# Le service doit tourner
$svc = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($svc -and $svc.Status -ne 'Running') {
  Warn "Service $($svc.Name) arrete, demarrage..."
  try { Start-Service $svc.Name; Ok "Service demarre." }
  catch { Die "Impossible de demarrer PostgreSQL. Lance ce fichier en tant qu'administrateur." }
}

# ── 1. Dependances ────────────────────────────────────────────
Step 1 "Installation des dependances"
if (Test-Path 'node_modules') {
  Ok "Deja installees."
} else {
  Write-Host "      Quelques minutes la premiere fois...`n"
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Die "Echec de 'npm install'. Verifie ta connexion internet." }
  Ok "Dependances installees."
}

# ── 2. Mot de passe PostgreSQL ────────────────────────────────
Step 2 "Connexion a PostgreSQL"
Write-Host ""
Write-Host "      Saisis le mot de passe du compte 'postgres'"
Write-Host "      (celui choisi lors de l'installation de PostgreSQL)."
Write-Host "      La saisie reste invisible, c'est normal."
Write-Host ""

$secure = Read-Host "      Mot de passe postgres" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($plain)) { Die "Aucun mot de passe saisi." }

$env:PGPASSWORD = $plain
& $psql -U postgres -h localhost -p 5432 -c 'SELECT 1;' | Out-Null
if ($LASTEXITCODE -ne 0) {
  $env:PGPASSWORD = $null
  Die "Connexion refusee : le mot de passe est probablement incorrect.`n      Relance ce fichier et reessaie."
}
Ok "Connecte."

# ── 3. Base de donnees ────────────────────────────────────────
Step 3 "Base de donnees 'rage_lan_2'"
$exists = & $psql -U postgres -h localhost -p 5432 -tAc "SELECT 1 FROM pg_database WHERE datname='rage_lan_2'"
if ($exists -match '1') {
  Ok "Base deja existante."
} else {
  & $psql -U postgres -h localhost -p 5432 -c 'CREATE DATABASE rage_lan_2;' | Out-Null
  if ($LASTEXITCODE -ne 0) { $env:PGPASSWORD = $null; Die "Impossible de creer la base." }
  Ok "Base creee."
}
& $psql -U postgres -h localhost -p 5432 -d rage_lan_2 -c 'CREATE EXTENSION IF NOT EXISTS citext;' | Out-Null

# ── 4. Fichier .env ───────────────────────────────────────────
Step 4 "Configuration (.env)"
if (Test-Path '.env') {
  Copy-Item '.env' '.env.backup' -Force
  Warn "Ancien .env sauvegarde dans .env.backup"
}

# Le mot de passe part dans une URL : les caracteres speciaux
# (@ : / ? # & %) doivent etre encodes sous peine de casser la connexion.
$encoded = [uri]::EscapeDataString($plain)
# NB : pas de RandomNumberGenerator::GetBytes(int) en PowerShell 5.1 (.NET Framework).
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

$envContent = @"
DATABASE_URL="postgresql://postgres:$encoded@localhost:5432/rage_lan_2?schema=public"

AUTH_SECRET="$secret"
AUTH_COOKIE_NAME="rage_session"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_EVENT_NAME="R.A.G.E LAN 2"
NEXT_PUBLIC_EVENT_DATE="2026-10-17"

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
"@

# `Set-Content -Encoding utf8` ecrit un BOM en PowerShell 5.1, ce qui
# collerait un caractere invisible devant DATABASE_URL et casserait la
# lecture du fichier. On force donc l'UTF-8 sans BOM.
[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) '.env'),
  $envContent,
  (New-Object System.Text.UTF8Encoding($false))
)

$plain = $null
$env:PGPASSWORD = $null
Ok ".env ecrit (mot de passe encode pour l'URL)."

# ── 5. Tables + donnees ───────────────────────────────────────
Step 5 "Creation des tables et des 9 tournois"
npx prisma generate
if ($LASTEXITCODE -ne 0) { Die "Echec de 'prisma generate'." }

npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) { Die "Echec de la creation des tables." }

npm run db:seed
if ($LASTEXITCODE -ne 0) { Die "Echec du remplissage des donnees." }

# ── Recapitulatif ─────────────────────────────────────────────
Write-Host ""
Write-Host "  ===============================================" -ForegroundColor Green
Write-Host "    INSTALLATION TERMINEE" -ForegroundColor Green
Write-Host "  ===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "    Tes acces :" -ForegroundColor White
Write-Host ""
Write-Host "      ADMINISTRATEUR" -ForegroundColor Yellow
Write-Host "        Email         admin@ragelan.gg"
Write-Host "        Mot de passe  RageLan2!"
Write-Host "        Espace        http://localhost:3000/admin"
Write-Host ""
Write-Host "      ORGANISATEUR (staff)" -ForegroundColor Yellow
Write-Host "        Email         staff@ragelan.gg"
Write-Host "        Mot de passe  RageLan2!"
Write-Host "        Espace        http://localhost:3000/staff"
Write-Host ""
Write-Host "    Change ces mots de passe avant la vraie LAN." -ForegroundColor Red
Write-Host ""
Write-Host "    Lance maintenant  2-DEMARRER.bat" -ForegroundColor Cyan
Write-Host ""
exit 0

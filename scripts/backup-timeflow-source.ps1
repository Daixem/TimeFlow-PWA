[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Destination
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$git = Get-Command git -ErrorAction Stop

Push-Location $projectRoot
try {
  # Do not create a reassuring backup that silently excludes tracked edits.
  & $git.Source diff --quiet
  if ($LASTEXITCODE -ne 0) { throw "Tracked changes are not committed. Review and push them to GitHub first." }
  & $git.Source diff --cached --quiet
  if ($LASTEXITCODE -ne 0) { throw "Staged changes are not committed. Commit and push them to GitHub first." }

  $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd-HHmmss'Z'")
  $backupDirectory = Join-Path $Destination "TimeFlow-backup-$timestamp"
  New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

  $bundle = Join-Path $backupDirectory "TimeFlow-source.bundle"
  & $git.Source bundle create $bundle --all
  if ($LASTEXITCODE -ne 0) { throw "Could not create the Git bundle." }

  $commit = (& $git.Source rev-parse HEAD).Trim()
  $remote = (& $git.Source remote get-url origin).Trim()
  @(
    "TimeFlow portable source backup",
    "Created UTC: $timestamp",
    "Commit: $commit",
    "Origin: $remote",
    "Contents: complete Git history and all refs",
    "Excluded intentionally: node_modules, build outputs, caches, local browser data, .env files and all hosted D1 data",
    "Restore: git clone TimeFlow-source.bundle TimeFlow"
  ) | Set-Content -LiteralPath (Join-Path $backupDirectory "MANIFEST.txt") -Encoding utf8

  Get-FileHash -LiteralPath $bundle -Algorithm SHA256 |
    ForEach-Object { "$($_.Hash)  $($_.Path | Split-Path -Leaf)" } |
    Set-Content -LiteralPath (Join-Path $backupDirectory "SHA256SUMS.txt") -Encoding ascii

  Write-Output "TimeFlow source backup created: $backupDirectory"
} finally {
  Pop-Location
}

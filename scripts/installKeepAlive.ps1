# Starts the local dev server automatically at Windows logon, hidden, via the
# keep-alive supervisor. No admin rights needed: it uses the per-user Startup
# folder.
#
#   Install:   powershell -ExecutionPolicy Bypass -File scripts\installKeepAlive.ps1
#   Remove:    powershell -ExecutionPolicy Bypass -File scripts\installKeepAlive.ps1 -Uninstall

param([switch]$Uninstall)

$root    = Split-Path -Parent $PSScriptRoot
$startup = [Environment]::GetFolderPath('Startup')
$entry   = Join-Path $startup 'AWS Launchpad dev server.vbs'

if ($Uninstall) {
  if (Test-Path $entry) { Remove-Item $entry -Confirm:$false; "Removed $entry" } else { "Not installed." }
  return
}

$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $root 'scripts\keepAlive.mjs'

# A .vbs launcher runs node with no console window (0 = hidden).
$vbs = @"
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "$root"
sh.Run """$node"" ""$script""", 0, False
"@
Set-Content -Path $entry -Value $vbs -Encoding ASCII
"Installed: $entry"
"The app will start at every logon on http://localhost:5273/ (log: tmp\keep-alive.log)."

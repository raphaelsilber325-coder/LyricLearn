# Tiny static file server for previewing the site (no Node/Python needed).
# Serves files from this script's own folder on http://localhost:5500/

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 5500
$prefix = "http://localhost:$port/"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.mp3'  = 'audio/mpeg'
  '.mp4'  = 'video/mp4'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving '$root' at $prefix  (Ctrl+C to stop)"

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $path = Join-Path $root $rel

    if (Test-Path $path -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $total = $bytes.Length
      $res.AddHeader('Accept-Ranges', 'bytes')   # tell the browser seeking is supported
      $res.ContentType = $ct

      # Honor HTTP Range requests (needed for reliable audio/video playback + seeking)
      $start = 0; $end = $total - 1
      $isPartial = $false; $unsat = $false
      $range = $req.Headers['Range']
      if ($range -and ($range -match '^bytes=(\d*)-(\d*)$')) {
        $s = $matches[1]; $e = $matches[2]
        if ($s -eq '') {
          if ($e -ne '') {
            $n = [int64]$e; if ($n -gt $total) { $n = $total }
            $start = $total - $n; $end = $total - 1; $isPartial = $true
          }
        } else {
          $start = [int64]$s
          if ($e -ne '') { $end = [int64]$e }
          if ($end -ge $total) { $end = $total - 1 }
          if ($start -ge $total -or $start -gt $end) { $unsat = $true } else { $isPartial = $true }
        }
      }

      if ($unsat) {
        $res.StatusCode = 416
        $res.AddHeader('Content-Range', "bytes */$total")
        $res.ContentLength64 = 0
      } else {
        $len = $end - $start + 1
        if ($isPartial) {
          $res.StatusCode = 206
          $res.AddHeader('Content-Range', "bytes $start-$end/$total")
        } else {
          $res.StatusCode = 200
        }
        $res.ContentLength64 = $len
        $res.OutputStream.Write($bytes, [int]$start, [int]$len)
      }
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rel")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
    $res.OutputStream.Close()
  } catch {
    # ignore transient connection errors and keep serving
  }
}

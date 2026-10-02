param(
    [int]$Port = 4173,
    [string]$DataDirectory = (Join-Path $PSScriptRoot '.sip-of-ghoulaid-data')
)

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($PSScriptRoot)
New-Item -ItemType Directory -Path $DataDirectory -Force | Out-Null
$accountsFile = Join-Path $DataDirectory 'accounts.json'
$sessionsFile = Join-Path $DataDirectory 'sessions.json'
$customerAccountsFile = Join-Path $DataDirectory 'customer-accounts.json'
$customerSessionsFile = Join-Path $DataDirectory 'customer-sessions.json'

function Read-Store($path) {
    if (-not (Test-Path $path)) { return @() }
    $content = Get-Content -Raw -Path $path
    if ([string]::IsNullOrWhiteSpace($content)) { return @() }
    return @($content | ConvertFrom-Json)
}
function Write-Store($path, $value) {
    @($value) | ConvertTo-Json -Depth 5 | Set-Content -Path $path -Encoding UTF8
}
function New-PasswordRecord($password) {
    $salt = New-Object byte[] 16
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
    $derive = New-Object Security.Cryptography.Rfc2898DeriveBytes($password, $salt, 150000, [Security.Cryptography.HashAlgorithmName]::SHA256)
    @{ salt = [Convert]::ToBase64String($salt); hash = [Convert]::ToBase64String($derive.GetBytes(32)) }
}
function Test-Password($password, $record) {
    $salt = [Convert]::FromBase64String($record.salt)
    $derive = New-Object Security.Cryptography.Rfc2898DeriveBytes($password, $salt, 150000, [Security.Cryptography.HashAlgorithmName]::SHA256)
    return [Security.Cryptography.CryptographicOperations]::FixedTimeEquals($derive.GetBytes(32), [Convert]::FromBase64String($record.hash))
}
function Get-RequestBody($request) {
    $reader = New-Object IO.StreamReader($request.InputStream, $request.ContentEncoding)
    $text = $reader.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($text)) { return $null }
    return $text | ConvertFrom-Json
}
function Send-Json($response, $status, $data) {
    $bytes = [Text.Encoding]::UTF8.GetBytes(($data | ConvertTo-Json -Compress))
    $response.StatusCode = $status
    $response.ContentType = 'application/json; charset=utf-8'
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.Close()
}
function Get-Session($request, $cookieName, $file) {
    $cookie = $request.Cookies[$cookieName]
    if (-not $cookie) { return $null }
    $session = Read-Store $file | Where-Object { $_.token -eq $cookie.Value -and [datetime]$_.expiresAt -gt (Get-Date) } | Select-Object -First 1
    return $session
}
function New-Session($file, $username) {
    $tokenBytes = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($tokenBytes)
    $token = [Convert]::ToBase64String($tokenBytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')
    $sessions = @(Read-Store $file | Where-Object { [datetime]$_.expiresAt -gt (Get-Date) })
    $sessions += [pscustomobject]@{ token = $token; username = $username; expiresAt = (Get-Date).AddHours(8).ToUniversalTime().ToString('o') }
    Write-Store $file $sessions
    return $token
}
function Require-Owner($request, $response) {
    $session = Get-Session $request 'sip_owner_session' $sessionsFile
    if (-not $session) { Send-Json $response 401 @{ error = 'Sign in is required.' }; return $null }
    return $session
}

if (-not (Test-Path $accountsFile)) {
    $password = New-PasswordRecord 'ghoulaid-demo'
    Write-Store $accountsFile @([pscustomobject]@{ username = 'owner'; salt = $password.salt; hash = $password.hash; createdAt = (Get-Date).ToUniversalTime().ToString('o') })
}
if (-not (Test-Path $sessionsFile)) { Write-Store $sessionsFile @() }
if (-not (Test-Path $customerAccountsFile)) { Write-Store $customerAccountsFile @() }
if (-not (Test-Path $customerSessionsFile)) { Write-Store $customerSessionsFile @() }

$listener = New-Object Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Sip of Ghoulaid is running at http://localhost:$Port/"
Write-Host "Press Ctrl+C to stop."

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request, $response = $context.Request, $context.Response
        $path = $request.Url.AbsolutePath
        try {
            if ($path -eq '/api/auth/session' -and $request.HttpMethod -eq 'GET') {
                $session = Get-Session $request 'sip_owner_session' $sessionsFile
                Send-Json $response 200 @{ authenticated = [bool]$session; username = if ($session) { $session.username } else { $null } }
                continue
            }
            if ($path -eq '/api/auth/login' -and $request.HttpMethod -eq 'POST') {
                $body = Get-RequestBody $request
                $account = Read-Store $accountsFile | Where-Object { $_.username -ieq $body.username.Trim() } | Select-Object -First 1
                if (-not $account -or -not (Test-Password $body.password $account)) { Send-Json $response 401 @{ error = 'Invalid username or password.' }; continue }
                $token = New-Session $sessionsFile $account.username
                $response.Headers.Add('Set-Cookie', "sip_owner_session=$token; Path=/; HttpOnly; SameSite=Strict")
                Send-Json $response 200 @{ username = $account.username }
                continue
            }
            if ($path -eq '/api/auth/logout' -and $request.HttpMethod -eq 'POST') {
                $session = Get-Session $request 'sip_owner_session' $sessionsFile
                if ($session) { Write-Store $sessionsFile @(Read-Store $sessionsFile | Where-Object { $_.token -ne $session.token }) }
                $response.Headers.Add('Set-Cookie', 'sip_owner_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
                Send-Json $response 200 @{ ok = $true }
                continue
            }
            if ($path -eq '/api/owner-accounts' -and $request.HttpMethod -eq 'POST') {
                if (-not (Require-Owner $request $response)) { continue }
                $body = Get-RequestBody $request
                $username = $body.username.Trim().ToLowerInvariant()
                if ($username -notmatch '^[a-z0-9_-]{3,32}$' -or $body.password.Length -lt 12) { Send-Json $response 400 @{ error = 'Use a 3–32 character username and a password of at least 12 characters.' }; continue }
                $accounts = @(Read-Store $accountsFile)
                if ($accounts | Where-Object { $_.username -ieq $username }) { Send-Json $response 409 @{ error = 'That username is already in use.' }; continue }
                $password = New-PasswordRecord $body.password
                $accounts += [pscustomobject]@{ username = $username; salt = $password.salt; hash = $password.hash; createdAt = (Get-Date).ToUniversalTime().ToString('o') }
                Write-Store $accountsFile $accounts
                Send-Json $response 201 @{ username = $username }
                continue
            }
            if ($path -eq '/api/customer-auth/session' -and $request.HttpMethod -eq 'GET') {
                $session = Get-Session $request 'sip_customer_session' $customerSessionsFile
                Send-Json $response 200 @{ authenticated = [bool]$session; username = if ($session) { $session.username } else { $null } }
                continue
            }
            if ($path -eq '/api/customer-auth/register' -and $request.HttpMethod -eq 'POST') {
                $body = Get-RequestBody $request
                $username = $body.username.Trim().ToLowerInvariant()
                $email = $body.email.Trim().ToLowerInvariant()
                if ($username -notmatch '^[a-z0-9_-]{3,32}$' -or $email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$' -or $body.password.Length -lt 12) { Send-Json $response 400 @{ error = 'Use a 3–32 character username, a valid email, and a password of at least 12 characters.' }; continue }
                $accounts = @(Read-Store $customerAccountsFile)
                if ($accounts | Where-Object { $_.username -ieq $username -or $_.email -ieq $email }) { Send-Json $response 409 @{ error = 'That username or email is already registered.' }; continue }
                $password = New-PasswordRecord $body.password
                $accounts += [pscustomobject]@{ username = $username; email = $email; salt = $password.salt; hash = $password.hash; createdAt = (Get-Date).ToUniversalTime().ToString('o') }
                Write-Store $customerAccountsFile $accounts
                $token = New-Session $customerSessionsFile $username
                $response.Headers.Add('Set-Cookie', "sip_customer_session=$token; Path=/; HttpOnly; SameSite=Strict")
                Send-Json $response 201 @{ username = $username }
                continue
            }
            if ($path -eq '/api/customer-auth/login' -and $request.HttpMethod -eq 'POST') {
                $body = Get-RequestBody $request
                $identity = $body.identity.Trim().ToLowerInvariant()
                $account = Read-Store $customerAccountsFile | Where-Object { $_.username -ieq $identity -or $_.email -ieq $identity } | Select-Object -First 1
                if (-not $account -or -not (Test-Password $body.password $account)) { Send-Json $response 401 @{ error = 'Invalid username/email or password.' }; continue }
                $token = New-Session $customerSessionsFile $account.username
                $response.Headers.Add('Set-Cookie', "sip_customer_session=$token; Path=/; HttpOnly; SameSite=Strict")
                Send-Json $response 200 @{ username = $account.username }
                continue
            }
            if ($path -eq '/api/customer-auth/logout' -and $request.HttpMethod -eq 'POST') {
                $session = Get-Session $request 'sip_customer_session' $customerSessionsFile
                if ($session) { Write-Store $customerSessionsFile @(Read-Store $customerSessionsFile | Where-Object { $_.token -ne $session.token }) }
                $response.Headers.Add('Set-Cookie', 'sip_customer_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
                Send-Json $response 200 @{ ok = $true }
                continue
            }
            if ($request.HttpMethod -ne 'GET' -and $request.HttpMethod -ne 'HEAD') { Send-Json $response 405 @{ error = 'Method not allowed.' }; continue }
            $relative = [Uri]::UnescapeDataString($path.TrimStart('/'))
            if ([string]::IsNullOrEmpty($relative)) { $relative = 'index.html' }
            $file = [IO.Path]::GetFullPath((Join-Path $root $relative))
            if (-not $file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $file -PathType Leaf)) { $response.StatusCode = 404; $response.Close(); continue }
            $types = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8' }
            $response.ContentType = if ($types.ContainsKey([IO.Path]::GetExtension($file))) { $types[[IO.Path]::GetExtension($file)] } else { 'application/octet-stream' }
            $bytes = [IO.File]::ReadAllBytes($file)
            $response.ContentLength64 = $bytes.Length
            if ($request.HttpMethod -eq 'GET') { $response.OutputStream.Write($bytes, 0, $bytes.Length) }
            $response.Close()
        } catch {
            try {
                if ($response.OutputStream.CanWrite) { Send-Json $response 500 @{ error = 'The local server could not complete that request.' } }
            } catch {
                # The client disconnected after the response was already submitted.
            }
        }
    }
} finally { $listener.Stop() }

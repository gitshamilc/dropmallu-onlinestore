# generate-sitemap.ps1
Write-Host "Generating dynamic sitemap via PowerShell..."

$siteUrl = "https://dropmallu.xyz"
$today = (Get-Date).ToString("yyyy-MM-dd")

# 1. Read config.js
$configPath = Join-Path $PSScriptRoot "js/config.js"
if (-not (Test-Path $configPath)) {
    Write-Error "Config file js/config.js not found!"
    Exit 1
}
$configContent = Get-Content $configPath -Raw

# 2. Extract Credentials
$urlPattern = 'SUPABASE_URL\s*:\s*["'']([^"'']+)["'']'
$keyPattern = 'SUPABASE_ANON_KEY\s*:\s*["'']([^"'']+)["'']'

$supabaseUrl = ""
$supabaseKey = ""

if ($configContent -match $urlPattern) {
    $supabaseUrl = $Matches[1]
}
if ($configContent -match $keyPattern) {
    $supabaseKey = $Matches[1]
}

$products = @()
$blogs = @()

if ($supabaseUrl -and $supabaseKey) {
    try {
        Write-Host "Fetching products and articles from Supabase..."
        $headers = @{
            "apikey" = $supabaseKey
            "Authorization" = "Bearer $supabaseKey"
        }
        
        $prodUrl = "$supabaseUrl/rest/v1/products?select=id"
        $prodRes = Invoke-RestMethod -Uri $prodUrl -Headers $headers -ErrorAction Stop
        if ($prodRes) {
            $products = $prodRes
            Write-Host "Fetched $($products.Count) products."
        }
        
        $blogUrl = "$supabaseUrl/rest/v1/banners?select=id"
        $blogRes = Invoke-RestMethod -Uri $blogUrl -Headers $headers -ErrorAction Stop
        if ($blogRes) {
            $blogs = $blogRes
            Write-Host "Fetched $($blogs.Count) articles."
        }
    } catch {
        Write-Warning "Error connecting to Supabase: $_"
    }
} else {
    Write-Host "No Supabase credentials configured."
}

# 3. Construct XML
$xml = @"
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Core Pages -->
  <url>
    <loc>$siteUrl/</loc>
    <lastmod>$today</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>$siteUrl/index.html</loc>
    <lastmod>$today</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
"@

if ($products.Count -gt 0) {
    $xml += "`n  <!-- Products (Deep Links) -->`n"
    foreach ($p in $products) {
        $xml += @"
  <url>
    <loc>$siteUrl/#product-$($p.id)</loc>
    <lastmod>$today</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

"@
    }
}

if ($blogs.Count -gt 0) {
    $xml += "`n  <!-- Blog Articles (Deep Links) -->`n"
    foreach ($b in $blogs) {
        $xml += @"
  <url>
    <loc>$siteUrl/#blog-$($b.id)</loc>
    <lastmod>$today</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

"@
    }
}

$xml += "</urlset>`n"

$sitemapPath = Join-Path $PSScriptRoot "sitemap.xml"
# Write with UTF8 encoding explicitly (without BOM)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($sitemapPath, $xml, $utf8NoBom)
Write-Host "Successfully wrote sitemap.xml with $($products.Count) products and $($blogs.Count) blog entries!"

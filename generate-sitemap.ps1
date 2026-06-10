# generate-sitemap.ps1
Write-Host "Generating dynamic sitemap via PowerShell..."

$siteUrl = "https://dropymart.xyz"
$today = (Get-Date).ToString("yyyy-MM-dd")

# Helper function to generate clean URL slug matching JS utility
function Get-Slug ($Text) {
    if (-not $Text) { return "" }
    $slug = $Text.ToString().ToLower()
    $slug = $slug.Trim()
    $slug = $slug -replace '\s+', '-'
    $slug = $slug -replace '[^\w\-]+', ''
    $slug = $slug -replace '\-+', '-'
    $slug = $slug.Trim('-')
    return $slug
}

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
        
        $prodUrl = "$supabaseUrl/rest/v1/products?select=id,name"
        $prodRes = Invoke-RestMethod -Uri $prodUrl -Headers $headers -ErrorAction Stop
        if ($prodRes) {
            $products = $prodRes
            Write-Host "Fetched $($products.Count) products from Supabase."
        }
        
        $blogUrl = "$supabaseUrl/rest/v1/banners?select=id,title"
        $blogRes = Invoke-RestMethod -Uri $blogUrl -Headers $headers -ErrorAction Stop
        if ($blogRes) {
            $blogs = $blogRes
            Write-Host "Fetched $($blogs.Count) articles from Supabase."
        }
    } catch {
        Write-Warning "Error connecting to Supabase: $_"
    }
}

# Fallback to local default JSON files if Supabase is offline or empty
if ($products.Count -eq 0) {
    $defaultProductsPath = Join-Path $PSScriptRoot "default_products.json"
    if (Test-Path $defaultProductsPath) {
        Write-Host "Loading fallback default products from JSON file..."
        $products = Get-Content $defaultProductsPath -Raw | ConvertFrom-Json
    }
}
if ($blogs.Count -eq 0) {
    $defaultBlogsPath = Join-Path $PSScriptRoot "default_blogs.json"
    if (Test-Path $defaultBlogsPath) {
        Write-Host "Loading fallback default blogs from JSON file..."
        $blogs = Get-Content $defaultBlogsPath -Raw | ConvertFrom-Json
    }
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

# Category pages
$categories = @("watch", "powerbank", "shoe", "projector", "gadgets", "deals", "all")
$xml += "`n  <!-- Categories -->`n"
foreach ($cat in $categories) {
    $xml += @"
  <url>
    <loc>$siteUrl/category/$cat</loc>
    <lastmod>$today</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

"@
}

# Product pages (Clean URL Slug)
if ($products.Count -gt 0) {
    $xml += "`n  <!-- Products (Clean SEO URLs) -->`n"
    foreach ($p in $products) {
        $slug = Get-Slug $p.name
        if ($slug) {
            $xml += @"
  <url>
    <loc>$siteUrl/product/$slug</loc>
    <lastmod>$today</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

"@
        }
    }
}

# Blog articles (Clean URL Slug)
if ($blogs.Count -gt 0) {
    $xml += "`n  <!-- Blog Articles (Clean SEO URLs) -->`n"
    foreach ($b in $blogs) {
        $slug = Get-Slug $b.title
        if ($slug) {
            $xml += @"
  <url>
    <loc>$siteUrl/blog/$slug</loc>
    <lastmod>$today</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

"@
        }
    }
}

$xml += "</urlset>`n"

$sitemapPath = Join-Path $PSScriptRoot "sitemap.xml"
# Write with UTF8 encoding explicitly (without BOM)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($sitemapPath, $xml, $utf8NoBom)
Write-Host "Successfully wrote sitemap.xml with $($products.Count) products, $($blogs.Count) blog entries, and category pages!"

$ErrorActionPreference = 'Stop'
$base = 'https://sunseekerstours.com/wp-json/wp/v2'
$out = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-AllPages($endpoint) {
    $page = 1
    $all = @()
    do {
        $r = Invoke-RestMethod -Uri "$base/$endpoint`?per_page=100&page=$page" -Headers @{Accept='application/json'} -TimeoutSec 60
        $all += $r
        $page++
    } while ($r.Count -eq 100)
    return $all
}

$capture = [ordered]@{}
$capture['generated_at'] = (Get-Date -Format o)
$capture['source'] = $base

Write-Host 'Fetching trips...'
$trips = Get-AllPages 'trip'
$capture['trips'] = $trips

Write-Host 'Fetching pages...'
$pages = Get-AllPages 'pages'
$capture['pages'] = $pages

Write-Host 'Fetching posts...'
$posts = Get-AllPages 'posts'
$capture['posts'] = $posts

foreach ($tax in @('destination','activities','trip_types','difficulty','trip_tag')) {
    Write-Host "Fetching taxonomy: $tax"
    try {
        $terms = Get-AllPages $tax
        $capture["tax_$tax"] = $terms
    } catch {
        Write-Host "  (skipped $tax): $($_.Exception.Message)"
        $capture["tax_$tax"] = @()
    }
}

$file = Join-Path $out 'wordpress-capture.json'
$capture | ConvertTo-Json -Depth 20 | Set-Content -Path $file -Encoding UTF8
Write-Host "Saved $file ($((Get-Item $file).Length) bytes)"
Write-Host "trips=$($trips.Count) pages=$($pages.Count) posts=$($posts.Count)"

$meta = [ordered]@{
    generated_at = (Get-Date -Format o)
    trip_count    = $trips.Count
    page_count    = $pages.Count
    post_count    = $posts.Count
}
$meta | ConvertTo-Json | Set-Content -Path (Join-Path $out 'capture-index.json') -Encoding UTF8

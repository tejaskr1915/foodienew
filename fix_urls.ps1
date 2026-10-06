$files = Get-ChildItem -Recurse -File c:\foodie\src -Include *.js,*.jsx

$pairs = @(
  "/restaurant/food/","/food/",
  "/restaurant/tables/","/tables/",
  "/restaurant/categories/","/categories/",
  "/restaurant/restaurants/","/restaurants/",
  "/restaurant/inventory/","/inventory/",
  "/restaurant/food-images/","/food-images/",
  "/orders/orders/","/orders/",
  "/orders/order-items/","/order-items/",
  "/orders/carts/","/carts/",
  "/orders/cart-items/","/cart-items/",
  "/orders/payments/","/payments/",
  "/users/users/","/users/",
  "/users/addresses/","/addresses/"
)

$totalChanges = 0

foreach ($file in $files) {
  $content = [System.IO.File]::ReadAllText($file.FullName)
  $original = $content
  
  for ($i = 0; $i -lt $pairs.Count; $i += 2) {
    $from = $pairs[$i]
    $to = $pairs[$i+1]
    $content = $content.Replace($from, $to)
  }
  
  if ($content -ne $original) {
    [System.IO.File]::WriteAllText($file.FullName, $content)
    $totalChanges++
    Write-Host "Updated: $($file.Name)"
  }
}

Write-Host "Total files changed: $totalChanges"

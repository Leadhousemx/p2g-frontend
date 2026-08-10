param(
  [string]$BaseUrl = $(if ($env:P2G_API_URL) { $env:P2G_API_URL } else { 'http://localhost:5000' }),
  [string]$Email = $env:P2G_TEST_EMAIL,
  [string]$Password = $env:P2G_TEST_PASSWORD,
  [string]$ProveedorId,
  [string]$ProveedorNombre,
  [string]$EventoId
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Add-Type -AssemblyName System.Web

$InvariantCulture = [System.Globalization.CultureInfo]::InvariantCulture
$BaseUrl = ([string]$BaseUrl).TrimEnd('/')

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  throw 'BaseUrl es obligatorio.'
}

if ([string]::IsNullOrWhiteSpace($Email) -or [string]::IsNullOrWhiteSpace($Password)) {
  throw 'Debes proporcionar Email y Password mediante parámetros o variables P2G_TEST_EMAIL y P2G_TEST_PASSWORD.'
}

$Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function ConvertTo-ApiBody {
  param([object]$Body)

  if ($null -eq $Body) {
    return $null
  }

  return ($Body | ConvertTo-Json -Depth 20)
}

function Get-ErrorResponseBody {
  param([object]$Exception)

  $errorDetails = $Exception.ErrorDetails
  if ($errorDetails -and $errorDetails.Message) {
    return $errorDetails.Message
  }

  $response = $Exception.Response
  if ($null -eq $response) {
    return $null
  }

  try {
    $stream = $response.GetResponseStream()
    if ($null -eq $stream) {
      return $null
    }

    $reader = New-Object System.IO.StreamReader($stream)
    return $reader.ReadToEnd()
  } catch {
    return $null
  }
}

function ConvertFrom-ApiJson {
  param([string]$Content)

  if ([string]::IsNullOrWhiteSpace($Content)) {
    return $null
  }

  try {
    return ($Content | ConvertFrom-Json -Depth 30)
  } catch {
    return $Content
  }
}

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [hashtable]$Headers,
    [object]$Body,
    [int]$TimeoutSec = 60
  )

  $uri = if ($Path.StartsWith('http')) { $Path } else { "$BaseUrl$Path" }
  $requestHeaders = @{
    Accept = 'application/json'
  }

  if ($Headers) {
    foreach ($key in $Headers.Keys) {
      $requestHeaders[$key] = $Headers[$key]
    }
  }

  $invokeParams = @{
    Uri = $uri
    Method = $Method
    Headers = $requestHeaders
    WebSession = $Session
    UseBasicParsing = $true
    TimeoutSec = $TimeoutSec
  }

  $jsonBody = ConvertTo-ApiBody -Body $Body
  if ($null -ne $jsonBody) {
    $invokeParams.ContentType = 'application/json'
    $invokeParams.Body = $jsonBody
  }

  try {
    $response = Invoke-WebRequest @invokeParams
    return [PSCustomObject]@{
      StatusCode = [int]$response.StatusCode
      Data = ConvertFrom-ApiJson -Content $response.Content
      Content = $response.Content
      Headers = $response.Headers
    }
  } catch {
    $statusCode = 0
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    $responseBody = Get-ErrorResponseBody -Exception $_.Exception
    $parsedBody = ConvertFrom-ApiJson -Content $responseBody
    $errorMessage = $_.Exception.Message

    if ($parsedBody -is [string] -and -not [string]::IsNullOrWhiteSpace($parsedBody)) {
      $errorMessage = $parsedBody
    } elseif ($parsedBody -and $parsedBody.message) {
      $errorMessage = [string]$parsedBody.message
    } elseif ($parsedBody -and $parsedBody.msg) {
      $errorMessage = [string]$parsedBody.msg
    }

    throw ([System.Exception]::new("$Method $Path falló con status $statusCode. $errorMessage"))
  }
}

function Get-EntityId {
  param([object]$Value)

  if ($null -eq $Value) {
    return $null
  }

  if ($Value -is [string] -or $Value -is [int] -or $Value -is [long]) {
    $text = [string]$Value
    return $(if ([string]::IsNullOrWhiteSpace($text)) { $null } else { $text })
  }

  foreach ($propertyName in @('_id', 'id')) {
    $property = $Value.PSObject.Properties[$propertyName]
    if ($property -and -not [string]::IsNullOrWhiteSpace([string]$property.Value)) {
      return [string]$property.Value
    }
  }

  return $null
}

function Get-EntityName {
  param([object]$Value)

  if ($null -eq $Value) {
    return $null
  }

  foreach ($propertyName in @('nombre', 'name', 'evento', 'titulo', 'proveedorNombre', 'nombreComercial', 'razonSocial')) {
    $property = $Value.PSObject.Properties[$propertyName]
    if ($property -and -not [string]::IsNullOrWhiteSpace([string]$property.Value)) {
      return [string]$property.Value
    }
  }

  return $null
}

function Get-Collection {
  param([object]$Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [System.Array]) {
    return @($Value)
  }

  foreach ($propertyName in @('compras', 'proveedores', 'eventos', 'items', 'data', 'results', 'rows', 'docs')) {
    $property = $Value.PSObject.Properties[$propertyName]
    if ($property -and $property.Value -is [System.Array]) {
      return @($property.Value)
    }
  }

  return @()
}

function Format-DecimalString {
  param([object]$Value)

  if ($null -eq $Value) {
    return $null
  }

  $raw = [string]$Value
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  $decimalValue = [decimal]::Parse($raw, $InvariantCulture)
  return $decimalValue.ToString('0.###', $InvariantCulture)
}

function Assert-Equal {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][object]$Expected,
    [Parameter(Mandatory = $true)][object]$Actual
  )

  if ([string]$Expected -ne [string]$Actual) {
    throw "$Label no coincide. Esperado: $Expected. Actual: $Actual"
  }
}

function Get-CsrfToken {
  $csrfResponse = Invoke-Api -Method 'GET' -Path '/api/auth/csrf-token'
  $csrfData = $csrfResponse.Data
  $token = $null

  foreach ($propertyName in @('csrfToken', 'csrf_token', 'token')) {
    if ($null -ne $csrfData) {
      $property = $csrfData.PSObject.Properties[$propertyName]
      if ($property -and -not [string]::IsNullOrWhiteSpace([string]$property.Value)) {
        $token = [string]$property.Value
        break
      }
    }
  }

  if ([string]::IsNullOrWhiteSpace($token) -and -not [string]::IsNullOrWhiteSpace([string]$csrfResponse.Content)) {
    $tokenMatch = [System.Text.RegularExpressions.Regex]::Match([string]$csrfResponse.Content, '"csrfToken"\s*:\s*"(?<value>[^"]+)"')
    if ($tokenMatch.Success) {
      $token = $tokenMatch.Groups['value'].Value
    }
  }

  if ([string]::IsNullOrWhiteSpace($token)) {
    $cookie = $Session.Cookies.GetCookies($BaseUrl) | Where-Object { $_.Name -eq 'csrf_token' } | Select-Object -First 1
    if ($cookie -and -not [string]::IsNullOrWhiteSpace([string]$cookie.Value)) {
      $token = [string]$cookie.Value
    }
  }

  if ([string]::IsNullOrWhiteSpace($token)) {
    throw 'No se pudo obtener csrfToken desde /api/auth/csrf-token.'
  }

  return $token
}

function Resolve-Proveedor {
  param([string]$AccessToken)

  if (-not [string]::IsNullOrWhiteSpace($ProveedorId)) {
    return [PSCustomObject]@{
      Id = $ProveedorId
      Nombre = $(if ([string]::IsNullOrWhiteSpace($ProveedorNombre)) { $ProveedorId } else { $ProveedorNombre })
      Source = 'parameter'
    }
  }

  $authHeaders = @{ Authorization = "Bearer $AccessToken" }
  $comprasResponse = Invoke-Api -Method 'GET' -Path '/api/compras?page=1&pageSize=20' -Headers $authHeaders
  $compras = Get-Collection -Value $comprasResponse.Data

  foreach ($compra in $compras) {
    $resolvedId = Get-EntityId -Value $compra.proveedorId
    if (-not [string]::IsNullOrWhiteSpace($resolvedId)) {
      return [PSCustomObject]@{
        Id = $resolvedId
        Nombre = $(if (-not [string]::IsNullOrWhiteSpace([string]$compra.proveedorNombre)) { [string]$compra.proveedorNombre } else { Get-EntityName -Value $compra.proveedorId })
        Source = 'compras-list'
      }
    }
  }

  $proveedoresResponse = Invoke-Api -Method 'GET' -Path '/api/proveedores?page=1&pageSize=20' -Headers $authHeaders
  $proveedores = Get-Collection -Value $proveedoresResponse.Data
  $proveedor = $proveedores | Select-Object -First 1

  if ($null -eq $proveedor) {
    throw 'No se encontró un proveedor válido para crear la compra de integración.'
  }

  return [PSCustomObject]@{
    Id = Get-EntityId -Value $proveedor
    Nombre = Get-EntityName -Value $proveedor
    Source = 'proveedores-list'
  }
}

function Resolve-Evento {
  param([string]$AccessToken)

  $authHeaders = @{ Authorization = "Bearer $AccessToken" }

  if (-not [string]::IsNullOrWhiteSpace($EventoId)) {
    $eventoDetail = Invoke-Api -Method 'GET' -Path "/api/eventos/$EventoId" -Headers $authHeaders
    return [PSCustomObject]@{
      Id = $EventoId
      Nombre = Get-EntityName -Value $eventoDetail.Data
      Source = 'parameter'
      Detail = $eventoDetail.Data
      ListStatusCode = $null
      DetailStatusCode = $eventoDetail.StatusCode
    }
  }

  $eventosListResponse = Invoke-Api -Method 'GET' -Path '/api/eventos' -Headers $authHeaders
  $eventos = Get-Collection -Value $eventosListResponse.Data
  $evento = $null

  foreach ($candidate in $eventos) {
    $estado = ''
    if ($candidate.PSObject.Properties['estado']) {
      $estado = [string]$candidate.estado
    } elseif ($candidate.PSObject.Properties['status']) {
      $estado = [string]$candidate.status
    }
    $normalizedEstado = $estado.Normalize([Text.NormalizationForm]::FormD) -replace '[\u0300-\u036f]', ''
    $normalizedEstado = $normalizedEstado.Trim().ToLowerInvariant()
    $contratado = ($candidate.contratado -eq $true) -or ($candidate.isContratado -eq $true) -or ($normalizedEstado -eq 'contratado')
    $activo = if ($candidate.PSObject.Properties['activo']) { $candidate.activo -ne $false } else { $true }
    if ($contratado -and $activo) {
      $evento = $candidate
      break
    }
  }

  if ($null -eq $evento) {
    $evento = $eventos | Select-Object -First 1
  }

  if ($null -eq $evento) {
    throw 'No se encontró un evento válido para la prueba de integración.'
  }

  $resolvedEventoId = Get-EntityId -Value $evento
  $eventoDetail = Invoke-Api -Method 'GET' -Path "/api/eventos/$resolvedEventoId" -Headers $authHeaders

  return [PSCustomObject]@{
    Id = $resolvedEventoId
    Nombre = $(if (-not [string]::IsNullOrWhiteSpace((Get-EntityName -Value $eventoDetail.Data))) { Get-EntityName -Value $eventoDetail.Data } else { Get-EntityName -Value $evento })
    Source = 'eventos-list'
    Detail = $eventoDetail.Data
    ListStatusCode = $eventosListResponse.StatusCode
    DetailStatusCode = $eventoDetail.StatusCode
  }
}

$loginCsrfToken = Get-CsrfToken
$loginResponse = Invoke-Api -Method 'POST' -Path '/api/auth/login' -Headers @{ 'X-CSRF-Token' = $loginCsrfToken } -Body @{ email = $Email; password = $Password }
$loginData = $loginResponse.Data
$accessToken = [string]($loginData.accessToken)

if ([string]::IsNullOrWhiteSpace($accessToken)) {
  throw 'El login no devolvió accessToken.'
}

$proveedor = Resolve-Proveedor -AccessToken $accessToken
$evento = Resolve-Evento -AccessToken $accessToken

if ([string]::IsNullOrWhiteSpace($proveedor.Id)) {
  throw 'No se pudo resolver proveedorId para la prueba.'
}

if ([string]::IsNullOrWhiteSpace($evento.Id)) {
  throw 'No se pudo resolver eventoId para la prueba.'
}

$authHeaders = @{ Authorization = "Bearer $accessToken" }
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddHHmmss')
$initialQuantityText = '3.908'
$updatedQuantityText = '2.75'
$unitPriceText = '123.45'

$initialQuantity = [decimal]::Parse($initialQuantityText, $InvariantCulture)
$updatedQuantity = [decimal]::Parse($updatedQuantityText, $InvariantCulture)
$unitPrice = [decimal]::Parse($unitPriceText, $InvariantCulture)
$initialSubtotal = [decimal]::Multiply($unitPrice, $initialQuantity)
$updatedSubtotal = [decimal]::Multiply($unitPrice, $updatedQuantity)

$createPayload = @{
  fecha = (Get-Date).ToString('yyyy-MM-dd')
  documentoTipo = 'Factura'
  documentoFolio = "IT-DEC-$stamp"
  proveedorId = $proveedor.Id
  formaPago = 'Contado'
  metodoPago = 'Transferencia'
  anticipo = 0
  items = @(
    @{
      productoNombre = "IT cantidad decimal $stamp"
      precioUnitario = [double]$unitPrice
      cantidad = [double]$initialQuantity
      subtotal = [double]$initialSubtotal
    }
  )
  tipoCompra = 'evento'
  eventoId = $evento.Id
  eventoNombre = $evento.Nombre
}

$createCsrfToken = Get-CsrfToken
$createResponse = Invoke-Api -Method 'POST' -Path '/api/compras' -Headers @{ Authorization = "Bearer $accessToken"; 'X-CSRF-Token' = $createCsrfToken } -Body $createPayload
$createdCompra = if ($createResponse.Data.compra) { $createResponse.Data.compra } else { $createResponse.Data }
$createdCompraId = Get-EntityId -Value $createdCompra

if ([string]::IsNullOrWhiteSpace($createdCompraId)) {
  throw 'El POST /api/compras no devolvió un id de compra.'
}

$getAfterCreateResponse = Invoke-Api -Method 'GET' -Path "/api/compras/$createdCompraId" -Headers $authHeaders
$fetchedAfterCreate = if ($getAfterCreateResponse.Data.compra) { $getAfterCreateResponse.Data.compra } else { $getAfterCreateResponse.Data }
$createdItem = @($fetchedAfterCreate.items)[0]
$createdQuantity = Format-DecimalString -Value $createdItem.cantidad

Assert-Equal -Label 'Cantidad después de POST/GET' -Expected $initialQuantityText -Actual $createdQuantity

$updatePayload = @{
  fecha = [string]$fetchedAfterCreate.fecha
  documentoTipo = [string]$fetchedAfterCreate.documentoTipo
  documentoFolio = [string]$fetchedAfterCreate.documentoFolio
  proveedorId = $(Get-EntityId -Value $fetchedAfterCreate.proveedorId)
  formaPago = [string]$fetchedAfterCreate.formaPago
  metodoPago = [string]$fetchedAfterCreate.metodoPago
  anticipo = [double]$(if ($null -ne $fetchedAfterCreate.anticipo) { $fetchedAfterCreate.anticipo } else { 0 })
  items = @(
    @{
      productoNombre = [string]$createdItem.productoNombre
      precioUnitario = [double]$unitPrice
      cantidad = [double]$updatedQuantity
      subtotal = [double]$updatedSubtotal
    }
  )
  tipoCompra = [string]$fetchedAfterCreate.tipoCompra
  eventoId = $(Get-EntityId -Value $fetchedAfterCreate.eventoId)
  eventoNombre = $(if (-not [string]::IsNullOrWhiteSpace([string]$fetchedAfterCreate.eventoNombre)) { [string]$fetchedAfterCreate.eventoNombre } else { $evento.Nombre })
}

$updateCsrfToken = Get-CsrfToken
$updateResponse = Invoke-Api -Method 'PUT' -Path "/api/compras/$createdCompraId" -Headers @{ Authorization = "Bearer $accessToken"; 'X-CSRF-Token' = $updateCsrfToken } -Body $updatePayload
$getAfterUpdateResponse = Invoke-Api -Method 'GET' -Path "/api/compras/$createdCompraId" -Headers $authHeaders
$fetchedAfterUpdate = if ($getAfterUpdateResponse.Data.compra) { $getAfterUpdateResponse.Data.compra } else { $getAfterUpdateResponse.Data }
$updatedItem = @($fetchedAfterUpdate.items)[0]
$updatedQuantityResult = Format-DecimalString -Value $updatedItem.cantidad

Assert-Equal -Label 'Cantidad después de PUT/GET' -Expected $updatedQuantityText -Actual $updatedQuantityResult

$encodedEventoId = [System.Web.HttpUtility]::UrlEncode($evento.Id)
$comprasListResponse = Invoke-Api -Method 'GET' -Path "/api/compras?eventoId=$encodedEventoId&page=1&pageSize=50" -Headers $authHeaders
$comprasFiltradas = Get-Collection -Value $comprasListResponse.Data
$createdCompraInList = $comprasFiltradas | Where-Object { (Get-EntityId -Value $_) -eq $createdCompraId } | Select-Object -First 1

if ($null -eq $createdCompraInList) {
  throw 'La compra creada no apareció en GET /api/compras filtrado por eventoId.'
}

$result = [ordered]@{
  ok = $true
  baseUrl = $BaseUrl
  endpoints = [ordered]@{
    login = [ordered]@{ path = '/api/auth/login'; status = $loginResponse.StatusCode }
    postCompra = [ordered]@{ path = '/api/compras'; status = $createResponse.StatusCode }
    getCompraAfterCreate = [ordered]@{ path = "/api/compras/$createdCompraId"; status = $getAfterCreateResponse.StatusCode }
    putCompra = [ordered]@{ path = "/api/compras/$createdCompraId"; status = $updateResponse.StatusCode }
    getCompraAfterUpdate = [ordered]@{ path = "/api/compras/$createdCompraId"; status = $getAfterUpdateResponse.StatusCode }
    getComprasList = [ordered]@{ path = "/api/compras?eventoId=$encodedEventoId&page=1&pageSize=50"; status = $comprasListResponse.StatusCode }
    getEventoDetail = [ordered]@{ path = "/api/eventos/$($evento.Id)"; status = $evento.DetailStatusCode }
  }
  provider = [ordered]@{
    id = $proveedor.Id
    nombre = $proveedor.Nombre
    source = $proveedor.Source
  }
  event = [ordered]@{
    id = $evento.Id
    nombre = $evento.Nombre
    source = $evento.Source
  }
  cantidadRoundtrip = [ordered]@{
    sentOnCreate = $initialQuantityText
    fetchedAfterCreate = $createdQuantity
    sentOnUpdate = $updatedQuantityText
    fetchedAfterUpdate = $updatedQuantityResult
  }
  payloadContract = [ordered]@{
    createCantidadType = $createPayload.items[0].cantidad.GetType().FullName
    updateCantidadType = $updatePayload.items[0].cantidad.GetType().FullName
    createCantidadJson = $createPayload.items[0].cantidad
    updateCantidadJson = $updatePayload.items[0].cantidad
    createSubtotalJson = $createPayload.items[0].subtotal
    updateSubtotalJson = $updatePayload.items[0].subtotal
  }
  compra = [ordered]@{
    id = $createdCompraId
    folio = [string]$fetchedAfterUpdate.folio
    documentoFolio = [string]$fetchedAfterUpdate.documentoFolio
    tipoCompra = [string]$fetchedAfterUpdate.tipoCompra
    eventoId = Get-EntityId -Value $fetchedAfterUpdate.eventoId
    proveedorId = Get-EntityId -Value $fetchedAfterUpdate.proveedorId
  }
}

$result | ConvertTo-Json -Depth 20
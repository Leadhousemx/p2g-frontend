const { chromium } = require('playwright');

const BASE_URL = process.env.P2G_BASE_URL || 'http://localhost:5173';
const EMAIL = process.env.P2G_EMAIL;
const PASSWORD = process.env.P2G_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Missing P2G_EMAIL or P2G_PASSWORD environment variables.');
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseCurrency(value) {
  const normalized = String(value || '').replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Could not parse currency value from: ${value}`);
  }
  return parsed;
}

function nearlyEqual(actual, expected, epsilon = 0.01) {
  return Math.abs(Number(actual) - Number(expected)) <= epsilon;
}

async function selectFirstOption(page, triggerSelector) {
  await page.locator(triggerSelector).click();
  const option = page.locator('[role="option"]').first();
  await option.waitFor({ state: 'visible', timeout: 15000 });
  const optionText = (await option.textContent())?.trim() || '';
  await option.click();
  return optionText;
}

async function createCompra(page, values) {
  const postRequestPromise = page.waitForRequest((request) => {
    return request.method() === 'POST' && /\/api\/compras(?:\?|$)/.test(request.url());
  }, { timeout: 30000 });
  const postResponsePromise = page.waitForResponse((response) => {
    return response.request().method() === 'POST' && /\/api\/compras(?:\?|$)/.test(response.url());
  }, { timeout: 30000 });

  await page.goto(`${BASE_URL}/compras/nueva?tipo=compras`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#documentoFolio', { timeout: 20000 });

  await page.locator('#documentoFolio').fill(values.documentoFolio);
  await selectFirstOption(page, '#proveedorId');

  if (values.formaPago === 'Anticipo') {
    await page.locator('#formaPago').click();
    await page.getByRole('option', { name: 'Anticipo', exact: true }).click();
    await page.locator('#anticipo').fill(String(values.anticipo));
  }

  await page.locator('input[placeholder="Ej: Harina de trigo"]').first().fill(values.productoNombre);
  await page.locator('#compraItems.0.cantidad').fill(String(values.cantidad));
  await page.locator('#compraItems.0.cantidad').blur();
  await page.locator('#compraItems.0.precioUnitario').fill(String(values.precioUnitario));
  await page.locator('#compraItems.0.precioUnitario').blur();
  await page.locator('#descuento').fill(String(values.descuento));
  await page.locator('#descuento').blur();

  if (values.expectedSummary) {
    await page.getByText(`$${values.expectedSummary.subtotal.toFixed(2)}`, { exact: true }).waitFor({ timeout: 15000 });
    await page.getByText(`$${values.expectedSummary.total.toFixed(2)}`, { exact: true }).waitFor({ timeout: 15000 });
  }

  await page.getByRole('button', { name: 'Guardar gasto' }).click();

  const postRequest = await postRequestPromise;
  const postResponse = await postResponsePromise;
  assert(postResponse.ok(), `POST /api/compras failed with status ${postResponse.status()}`);

  await page.waitForURL(/\/compras(?:\?|$)/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  const requestPayload = postRequest.postDataJSON();
  const responseJson = await postResponse.json();
  const compra = responseJson.compra || responseJson;
  const compraId = compra?._id || compra?.id;

  assert(compraId, 'POST /api/compras did not return a compra id.');

  return {
    requestPayload,
    responseJson,
    compraId,
  };
}

async function getCompraJson(page, compraId) {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/compras/${id}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    const data = await response.json();
    return {
      status: response.status,
      data,
    };
  }, compraId);
}

async function getComprasList(page, search) {
  return page.evaluate(async (query) => {
    const response = await fetch(`/api/compras?page=1&pageSize=50&q=${encodeURIComponent(query)}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    const data = await response.json();
    return {
      status: response.status,
      data,
    };
  }, search);
}

async function openDetailAndReadSummary(page, folioText) {
  const row = page.locator('tr', { hasText: folioText }).first();
  await row.waitFor({ state: 'visible', timeout: 30000 });
  const menuButton = row.locator('button[aria-haspopup="menu"]').first();
  await menuButton.click();
  await page.getByRole('menuitem', { name: /ver/i }).click();
  await page.getByText('Descuento').waitFor({ timeout: 15000 });

  const detailText = await page.locator('body').innerText();
  return detailText;
}

async function editCompra(page, compraId, discountValue, expectedTotal) {
  const putRequestPromise = page.waitForRequest((request) => {
    return request.method() === 'PUT' && new RegExp(`/api/compras/${escapeRegExp(compraId)}(?:\\?|$)`).test(request.url());
  }, { timeout: 30000 });
  const putResponsePromise = page.waitForResponse((response) => {
    return response.request().method() === 'PUT' && new RegExp(`/api/compras/${escapeRegExp(compraId)}(?:\\?|$)`).test(response.url());
  }, { timeout: 30000 });

  await page.goto(`${BASE_URL}/compras/${compraId}/editar`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#descuento', { timeout: 20000 });
  await page.locator('#descuento').fill(String(discountValue));
  await page.locator('#descuento').blur();
  await page.getByText(`$${expectedTotal.toFixed(2)}`, { exact: true }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Guardar gasto' }).click();

  const putRequest = await putRequestPromise;
  const putResponse = await putResponsePromise;
  assert(putResponse.ok(), `PUT /api/compras/${compraId} failed with status ${putResponse.status()}`);

  await page.waitForURL(/\/compras(?:\?|$)/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  return {
    requestPayload: putRequest.postDataJSON(),
    responseJson: await putResponse.json(),
  };
}

async function assertInvalidDiscountBlocked(page, compraId) {
  let putCount = 0;
  const listener = (request) => {
    if (request.method() === 'PUT' && new RegExp(`/api/compras/${escapeRegExp(compraId)}(?:\\?|$)`).test(request.url())) {
      putCount += 1;
    }
  };

  page.on('request', listener);
  try {
    await page.goto(`${BASE_URL}/compras/${compraId}/editar`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#descuento', { timeout: 20000 });
    await page.locator('#descuento').fill('20000');
    await page.locator('#descuento').blur();
    await page.getByRole('button', { name: 'Guardar gasto' }).click();
    await page.getByText('El descuento no puede ser mayor al subtotal de productos.').waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    assert(putCount === 0, `Expected invalid discount to be blocked in UI, but observed ${putCount} PUT request(s).`);
  } finally {
    page.off('request', listener);
  }
}

async function assertListTotal(page, folioText, expectedTotal) {
  await page.goto(`${BASE_URL}/compras?folio=${encodeURIComponent(folioText)}`, { waitUntil: 'networkidle' });
  const row = page.locator('tr', { hasText: folioText }).first();
  await row.waitFor({ state: 'visible', timeout: 30000 });
  const rowText = await row.innerText();
  const expectedCurrency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(expectedTotal);
  assert(rowText.includes(expectedCurrency), `Expected list row for ${folioText} to include ${expectedCurrency}, but got: ${rowText}`);
}

async function assertPagosSummary(page, compraId, expected) {
  await page.goto(`${BASE_URL}/compras/${compraId}/pagos`, { waitUntil: 'networkidle' });
  await page.getByText('Pagos del gasto').waitFor({ timeout: 20000 });

  const bodyText = await page.locator('body').innerText();
  const expectedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(expected.total);
  const expectedPagado = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(expected.pagado);
  const expectedSaldo = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(expected.saldo);

  assert(bodyText.includes(expectedTotal), `Expected pagos page to include total ${expectedTotal}`);
  assert(bodyText.includes(expectedPagado), `Expected pagos page to include paid amount ${expectedPagado}`);
  assert(bodyText.includes(expectedSaldo), `Expected pagos page to include balance ${expectedSaldo}`);

  return bodyText;
}

async function assertMobileSmoke(browser, storageStatePath, folioText) {
  const mobileContext = await browser.newContext({
    storageState: storageStatePath,
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });

  const mobilePage = await mobileContext.newPage();
  try {
    await mobilePage.goto(`${BASE_URL}/compras?folio=${encodeURIComponent(folioText)}`, { waitUntil: 'networkidle' });
    await mobilePage.getByText(folioText).first().waitFor({ timeout: 30000 });
    const cardText = await mobilePage.locator('body').innerText();
    assert(cardText.includes(folioText), `Expected mobile list to render folio ${folioText}.`);
  } finally {
    await mobileContext.close();
  }
}

async function main() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  const page = await context.newPage();

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const noDiscountFolio = `SMK-D0-${stamp}`;
  const withDiscountFolio = `SMK-D1-${stamp}`;
  const productoNombre = `Smoke descuento ${stamp}`;

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Correo electrónico').fill(EMAIL);
    await page.getByPlaceholder('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL(/\/(dashboard|compras|cotizaciones|clientes|proveedores|pagos|catalogos|catalogo|paquetes|negocios|reportes|salones|configuracion|perfil)/, { timeout: 30000 });

    const createNoDiscount = await createCompra(page, {
      documentoFolio: noDiscountFolio,
      productoNombre: `${productoNombre} sin descuento`,
      cantidad: 10,
      precioUnitario: 1000,
      descuento: 0,
      expectedSummary: { subtotal: 10000, total: 10000 },
    });

    assert(Number(createNoDiscount.requestPayload.descuento || 0) === 0, 'Expected create payload without discount to send descuento=0.');
    assert(nearlyEqual(createNoDiscount.requestPayload.total, 10000), 'Expected create payload without discount to send total=10000.');
    await assertListTotal(page, noDiscountFolio, 10000);

    const noDiscountGet = await getCompraJson(page, createNoDiscount.compraId);
    assert(noDiscountGet.status === 200, `GET /api/compras/${createNoDiscount.compraId} failed with status ${noDiscountGet.status}`);
    const noDiscountCompra = noDiscountGet.data.compra || noDiscountGet.data;
    assert(nearlyEqual(Number(noDiscountCompra.descuento || 0), 0), 'Expected persisted discount=0 after no-discount create.');
    assert(nearlyEqual(Number(noDiscountCompra.totalCompra ?? noDiscountCompra.total), 10000), 'Expected persisted total=10000 after no-discount create.');

    const createWithDiscount = await createCompra(page, {
      documentoFolio: withDiscountFolio,
      productoNombre: `${productoNombre} con descuento`,
      cantidad: 10,
      precioUnitario: 1000,
      descuento: 1000,
      formaPago: 'Anticipo',
      anticipo: 2000,
      expectedSummary: { subtotal: 10000, total: 9000 },
    });

    assert(nearlyEqual(Number(createWithDiscount.requestPayload.descuento || 0), 1000), 'Expected create payload with discount to send descuento=1000.');
    assert(nearlyEqual(Number(createWithDiscount.requestPayload.total || 0), 9000), 'Expected create payload with discount to send total=9000.');
    assert(nearlyEqual(Number(createWithDiscount.requestPayload.anticipo || 0), 2000), 'Expected create payload with discount to send anticipo=2000.');
    await assertListTotal(page, withDiscountFolio, 9000);

    const firstGet = await getCompraJson(page, createWithDiscount.compraId);
    assert(firstGet.status === 200, `GET /api/compras/${createWithDiscount.compraId} failed with status ${firstGet.status}`);
    const firstCompra = firstGet.data.compra || firstGet.data;
    assert(nearlyEqual(Number(firstCompra.descuento || 0), 1000), 'Expected persisted discount=1000 after discounted create.');
    assert(nearlyEqual(Number(firstCompra.subtotalProductos ?? firstCompra.monto), 10000), 'Expected persisted subtotalProductos=10000 after discounted create.');
    assert(nearlyEqual(Number(firstCompra.totalCompra ?? firstCompra.total), 9000), 'Expected persisted total=9000 after discounted create.');
    assert(nearlyEqual(Number(firstCompra.anticipo || 0), 2000), 'Expected persisted anticipo=2000 after discounted create.');

    await page.goto(`${BASE_URL}/compras/${createWithDiscount.compraId}/editar`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#descuento', { timeout: 20000 });
    assert((await page.locator('#descuento').inputValue()) === '1000', 'Expected edit form to reload discount=1000.');
    assert((await page.locator('#anticipo').inputValue()) === '2000', 'Expected edit form to reload anticipo=2000.');
    await page.goto(`${BASE_URL}/compras`, { waitUntil: 'networkidle' });

    const detailText = await openDetailAndReadSummary(page, withDiscountFolio);
    assert(detailText.includes('Subtotal'), 'Expected list detail modal to show subtotal row.');
    assert(detailText.includes('Descuento'), 'Expected list detail modal to show discount row.');
    assert(detailText.includes('$1,000.00'), 'Expected list detail modal to show discount amount 1000.00.');
    await page.keyboard.press('Escape');

    const pagosTextInitial = await assertPagosSummary(page, createWithDiscount.compraId, {
      total: 9000,
      pagado: 2000,
      saldo: 7000,
    });

    const apiList = await getComprasList(page, withDiscountFolio);
    assert(apiList.status === 200, `GET /api/compras list failed with status ${apiList.status}`);
    const listCollection = Array.isArray(apiList.data) ? apiList.data : Array.isArray(apiList.data?.compras) ? apiList.data.compras : Array.isArray(apiList.data?.data) ? apiList.data.data : [];
    const listedCompra = listCollection.find((item) => String(item.documentoFolio || '').trim() === withDiscountFolio || String(item.folio || '').trim() === withDiscountFolio);
    assert(listedCompra, 'Expected discounted compra to appear in backend list query.');
    assert(nearlyEqual(Number(listedCompra.totalCompra ?? listedCompra.total ?? listedCompra.monto), 9000), 'Expected backend list query to expose final discounted total.');

    const editTo500 = await editCompra(page, createWithDiscount.compraId, 500, 9500);
    assert(nearlyEqual(Number(editTo500.requestPayload.descuento || 0), 500), 'Expected edit payload to send descuento=500.');
    assert(nearlyEqual(Number(editTo500.requestPayload.total || 0), 9500), 'Expected edit payload to send total=9500.');
    await assertListTotal(page, withDiscountFolio, 9500);
    await assertPagosSummary(page, createWithDiscount.compraId, {
      total: 9500,
      pagado: 2000,
      saldo: 7500,
    });

    const editToZero = await editCompra(page, createWithDiscount.compraId, 0, 10000);
    assert(nearlyEqual(Number(editToZero.requestPayload.descuento || 0), 0), 'Expected edit payload to send descuento=0 when removing discount.');
    assert(nearlyEqual(Number(editToZero.requestPayload.total || 0), 10000), 'Expected edit payload to send total=10000 after removing discount.');
    await assertListTotal(page, withDiscountFolio, 10000);
    await assertPagosSummary(page, createWithDiscount.compraId, {
      total: 10000,
      pagado: 2000,
      saldo: 8000,
    });

    await assertInvalidDiscountBlocked(page, createWithDiscount.compraId);
    await assertMobileSmoke(browser, await context.storageState({ path: 'playwright-smoke-auth.json' }) || 'playwright-smoke-auth.json', withDiscountFolio);

    const finalGet = await getCompraJson(page, createWithDiscount.compraId);
    const finalCompra = finalGet.data.compra || finalGet.data;

    console.log(JSON.stringify({
      ok: true,
      baseUrl: BASE_URL,
      noDiscount: {
        compraId: createNoDiscount.compraId,
        documentoFolio: noDiscountFolio,
        descuento: Number(noDiscountCompra.descuento || 0),
        total: Number(noDiscountCompra.totalCompra ?? noDiscountCompra.total),
      },
      discountedFlow: {
        compraId: createWithDiscount.compraId,
        documentoFolio: withDiscountFolio,
        create: {
          descuento: Number(firstCompra.descuento || 0),
          subtotal: Number(firstCompra.subtotalProductos ?? firstCompra.monto),
          total: Number(firstCompra.totalCompra ?? firstCompra.total),
          anticipo: Number(firstCompra.anticipo || 0),
          saldoTextVerified: /7000|7,000/.test(pagosTextInitial),
        },
        final: {
          descuento: Number(finalCompra.descuento || 0),
          subtotal: Number(finalCompra.subtotalProductos ?? finalCompra.monto),
          total: Number(finalCompra.totalCompra ?? finalCompra.total),
          anticipo: Number(finalCompra.anticipo || 0),
          saldoPendiente: Number(finalCompra.saldoPendiente || 0),
        },
      },
      invalidDiscountBlockedInUi: true,
      mobileSmoke: true,
    }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
/**
 * Quotation Calculation Validator & Display Helper
 *
 * Use these functions to validate and display quotation data correctly
 * with the latest backend fixes for incluyeIva handling
 *
 * @author Backend Team
 * @date 2026-03-04
 * @related-file FRONTEND_INCLUYE_IVA_GUIDE.md
 */

/**
 * Validate quotation data integrity
 * Returns array of validation errors (empty = no errors)
 *
 * @param {Object} quotation - Quotation object from API
 * @returns {string[]} Array of error messages
 */
export function validateQuotationData(quotation) {
  const errors = [];

  if (!quotation) {
    return ['Quotation data is null or undefined'];
  }

  // Validation 1: IVA Consistency
  if (quotation.incluyeIva === true) {
    // If IVA is included in price, ivaMonto should be 0
    const ivaMonto = Number(quotation.ivaMonto) || 0;
    if (ivaMonto !== 0) {
      errors.push(
        `IVA Consistency Error: incluyeIva=true but ivaMonto=${ivaMonto} ` +
        `(should be 0)`
      );
    }
  }

  // Validation 2: Zero IVA Guarantee
  const ivaPct = Number(quotation.ivaPct) || 0;
  const ivaMonto = Number(quotation.ivaMonto) || 0;

  if (ivaPct === 0 && ivaMonto !== 0) {
    errors.push(
      `IVA Percentage Error: ivaPct=0% but ivaMonto=${ivaMonto} ` +
      `(when percentage is zero, amount must be zero)`
    );
  }

  // Validation 3: Total Calculation
  const expectedTotal = calculateExpectedTotal(quotation);
  const storedTotal = Number(quotation.total) || 0;
  const tolerance = 0.01; // $0.01 tolerance for rounding

  if (Math.abs(storedTotal - expectedTotal) > tolerance) {
    errors.push(
      `Total Calculation Error: ` +
      `Expected $${expectedTotal.toFixed(2)}, ` +
      `Got $${storedTotal.toFixed(2)} ` +
      `(Difference: $${(storedTotal - expectedTotal).toFixed(2)})`
    );
  }

  // Validation 4: Subtotal Sanity Check
  const subtotal = Number(quotation.subtotal) || 0;
  if (subtotal < 0) {
    errors.push(`Subtotal is negative: $${subtotal}`);
  }

  // Validation 5: Saldo (Balance) Consistency
  const anticipo = Number(quotation.anticipo) || 0;
  const saldo = Number(quotation.saldo) || 0;
  const expectedSaldo = storedTotal - anticipo;

  if (Math.abs(saldo - expectedSaldo) > tolerance) {
    errors.push(
      `Saldo Error: ` +
      `Expected $${expectedSaldo.toFixed(2)}, ` +
      `Got $${saldo.toFixed(2)}`
    );
  }

  return errors;
}

/**
 * Calculate expected total based on quotation structure
 *
 * @param {Object} quotation - Quotation object
 * @returns {number} Expected total amount
 */
export function calculateExpectedTotal(quotation) {
  const subtotal = Number(quotation.subtotal) || 0;
  const discountTotal = Number(quotation.descuentoTotal) || 0;
  const ivaMonto = Number(quotation.ivaMonto) || 0;
  const incluyeIva = quotation.incluyeIva === true;

  const subtotalAfterDiscount = subtotal - discountTotal;

  // If IVA is included, the ivaMonto should be 0 and total is just subtotal - discount
  if (incluyeIva) {
    return subtotalAfterDiscount;
  }

  // If IVA is not included, add it to the total
  return subtotalAfterDiscount + ivaMonto;
}

/**
 * Safe display object for showing quotation totals in UI
 *
 * @param {Object} quotation - Quotation object from API
 * @returns {Object} Display object with validation status and formatted values
 *
 * @example
 * const display = displayQuotationTotals(quotation);
 * if (display.hasErrors) {
 *   showErrorUI(display.errors);
 * } else {
 *   showTotalsUI(display.display);
 * }
 */
export function displayQuotationTotals(quotation) {
  // Step 1: Validate
  const errors = validateQuotationData(quotation);

  if (errors.length > 0) {
    return {
      hasErrors: true,
      errors: errors,
      severity: 'high',
      action: 'Contact support with error code'
    };
  }

  // Step 2: Prepare display values
  const subtotal = Number(quotation.subtotal) || 0;
  const discountTotal = Number(quotation.descuentoTotal) || 0;
  const ivaMonto = Number(quotation.ivaMonto) || 0;
  const total = Number(quotation.total) || 0;
  const anticipo = Number(quotation.anticipo) || 0;
  const saldo = Number(quotation.saldo) || 0;
  const ivaPct = Number(quotation.ivaPct) || 0;
  const incluyeIva = quotation.incluyeIva === true;

  const subtotalAfterDiscount = subtotal - discountTotal;

  return {
    hasErrors: false,
    errors: [],
    display: {
      subtotal: subtotal,
      subtotalFormatted: formatCurrency(subtotal),

      discountType: incluyeIva ?
        'Descuento (sobre total con IVA incluido)' :
        'Descuento (anterior a IVA)',
      discountAmount: discountTotal,
      discountAmountFormatted: formatCurrency(discountTotal),

      subtotalAfterDiscount: subtotalAfterDiscount,
      subtotalAfterDiscountFormatted: formatCurrency(subtotalAfterDiscount),

      ivaPercentage: ivaPct,
      ivaAmount: ivaMonto,
      ivaAmountFormatted: formatCurrency(ivaMonto),
      ivaNote: incluyeIva ?
        '(IVA incluido en precio - no se suma adicional)' :
        '(IVA adicional al subtotal)',
      ivaMode: incluyeIva ? 'INCLUDED' : 'ADDITIONAL',

      total: total,
      totalFormatted: formatCurrency(total),

      anticipo: anticipo,
      anticipoFormatted: formatCurrency(anticipo),

      saldo: saldo,
      saldoFormatted: formatCurrency(saldo),
      saldoStatus: saldo > 0 ? 'PENDING_PAYMENT' : 'PAID_IN_FULL',
      saldoStatusText: saldo > 0 ? 'Pendiente de Pago' : 'Pagado en su totalidad'
    }
  };
}

/**
 * Format number as currency
 * Default: $X,XXX.XX (USD style)
 *
 * @param {number} amount - Amount to format
 * @param {Object} options - Optional formatting config
 * @returns {string} Formatted currency string
 *
 * @example
 * formatCurrency(1234.567) // => "$1,234.57"
 * formatCurrency(1234.567, { symbol: '₱' }) // => "₱1,234.57"
 * formatCurrency(1234.567, { locale: 'es-MX' }) // => "$1,234.57"
 */
export function formatCurrency(amount, options = {}) {
  const {
    symbol = '$',
    decimals = 2,
    locale = 'en-US',
    prefix = true
  } = options;

  const num = Number(amount) || 0;
  const formatted = num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return prefix ? `${symbol}${formatted}` : `${formatted}${symbol}`;
}

/**
 * Get debugging information for a quotation
 * Use in browser console for troubleshooting
 *
 * @param {Object} quotation - Quotation object
 * @returns {Object} Debugging info
 */
export function getDebugInfo(quotation) {
  const validation = validateQuotationData(quotation);
  const isValid = validation.length === 0;

  console.group('🔍 Quotation Debug Information');

  // Basic info
  console.log('Folio:', quotation.folio);
  console.log('Estado:', quotation.estado);
  console.log('Eliminado:', quotation.eliminado || false);

  // IVA Configuration
  console.group('📋 IVA Configuration');
  console.log('incluyeIva:', quotation.incluyeIva);
  console.log('ivaPct:', quotation.ivaPct);
  console.log('ivaMonto:', quotation.ivaMonto);
  console.groupEnd();

  // Amount Breakdown
  console.group('💰 Amount Breakdown');
  console.log('subtotal:', quotation.subtotal);
  console.log('descuentoTotal:', quotation.descuentoTotal);
  console.log('descuentoTipo:', quotation.descuentoTipo);
  console.log('total:', quotation.total);
  console.log('anticipo:', quotation.anticipo);
  console.log('saldo:', quotation.saldo);
  console.groupEnd();

  // Duration Info
  if (quotation.eventDurationDays) {
    console.group('📅 Duration');
    console.log('eventDurationDays:', quotation.eventDurationDays);
    console.log('eventStartDate:', quotation.eventStartDate);
    console.log('eventEndDate:', quotation.eventEndDate);
    console.groupEnd();
  }

  // Validation Results
  console.group('✅ Validation Results');
  if (isValid) {
    console.log('%c✅ VALID - No errors found', 'color: green; font-weight: bold');
  } else {
    console.log('%c❌ INVALID - Errors found:', 'color: red; font-weight: bold');
    validation.forEach((error, i) => {
      console.log(`   [${i + 1}] ${error}`);
    });
  }
  console.groupEnd();

  // Expected vs Stored
  const expectedTotal = calculateExpectedTotal(quotation);
  console.group('🧮 Calculation Check');
  console.log('Expected Total:', expectedTotal);
  console.log('Stored Total:', quotation.total);
  console.log('Match:', isValid ? '✅ YES' : '❌ NO');
  console.groupEnd();

  console.groupEnd();

  return {
    folio: quotation.folio,
    isValid,
    errors: validation,
    expectedTotal,
    storedTotal: quotation.total
  };
}

/**
 * Create a summary string for logging/debugging
 *
 * @param {Object} quotation - Quotation object
 * @returns {string} One-line summary
 *
 * @example
 * console.log(getQuotationSummary(cot));
 * // Output: COT-2603001 | $26,600.00 | IVA-Inc | ✅
 */
export function getQuotationSummary(quotation) {
  const errors = validateQuotationData(quotation);
  const status = errors.length === 0 ? '✅' : '❌';
  const ivaMode = quotation.incluyeIva ? 'IVA-Inc' : 'IVA-Add';

  return (
    `${quotation.folio} | ` +
    `$${formatCurrency(quotation.total).slice(1)} | ` +
    `${ivaMode} | ` +
    `${status}`
  );
}

// ============================================================================
// EXPORT ALL FUNCTIONS FOR USE IN FRONTEND
// ============================================================================

export default {
  validateQuotationData,
  calculateExpectedTotal,
  displayQuotationTotals,
  formatCurrency,
  getDebugInfo,
  getQuotationSummary
};

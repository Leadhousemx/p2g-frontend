/**
 * QuotationTotals Component
 *
 * Real-world React component that demonstrates how to use the
 * quotation validation and display functions in production
 *
 * @author Frontend Team
 * @date 2026-03-04
 */

import React, { useEffect, useState } from 'react';
import {
  displayQuotationTotals,
  getDebugInfo
} from '../../utils/frontend-quotation-helpers';

/**
 * Component: QuotationTotals
 *
 * Safely displays quotation totals with validation
 *
 * @prop {Object} quotation - Quotation data from API
 * @prop {boolean} showDebug - Show debug info (default: false)
 * @prop {Function} onValidationError - Callback if validation fails
 */
export function QuotationTotals({
  quotation,
  showDebug = false,
  onValidationError = null
}) {
  const [displayData, setDisplayData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!quotation) {
      setIsLoading(false);
      return;
    }

    // Validate and prepare display
    const validation = displayQuotationTotals(quotation);

    if (validation.hasErrors && onValidationError) {
      onValidationError(validation.errors);
    }

    setDisplayData(validation);
    setIsLoading(false);

    // Debug logging
    if (showDebug) {
      console.log('QuotationTotals Debug:', getDebugInfo(quotation));
    }
  }, [quotation, showDebug, onValidationError]);

  if (isLoading) {
    return <div className="totals-loading">Cargando totales...</div>;
  }

  if (!displayData) {
    return <div className="totals-empty">No hay datos de cotización</div>;
  }

  // ERROR STATE
  if (displayData.hasErrors) {
    return (
      <ErrorBox
        title="⚠️ Error en Cálculo de Totales"
        errors={displayData.errors}
        folio={quotation.folio}
      />
    );
  }

  const { display } = displayData;

  // SUCCESS STATE
  return (
    <div className="quotation-totals">
      {/* Subtotal Section */}
      <TotalLine
        label="Subtotal"
        amount={display.subtotalFormatted}
        className="subtotal"
      />

      {/* Discount Section - Only show if discount exists */}
      {display.discountAmount > 0 && (
        <TotalLine
          label={display.discountType}
          amount={`-${display.discountAmountFormatted}`}
          className="discount"
        />
      )}

      {/* Subtotal After Discount */}
      {display.discountAmount > 0 && (
        <TotalLine
          label="Subtotal después de descuento"
          amount={display.subtotalAfterDiscountFormatted}
          className="subtotal-after-discount"
        />
      )}

      {/* IVA Section */}
      <IVASection
        ivaPercentage={display.ivaPercentage}
        ivaAmount={display.ivaAmountFormatted}
        ivaNote={display.ivaNote}
        ivaMode={display.ivaMode}
      />

      {/* TOTAL - Main emphasis */}
      <TotalLine
        label="TOTAL"
        amount={display.totalFormatted}
        className="total"
        emphasis={true}
      />

      {/* Anticipo & Saldo Section - Only show if anticipo > 0 */}
      {display.anticipo > 0 && (
        <BalanceSection
          anticipo={display.anticipoFormatted}
          saldo={display.saldoFormatted}
          saldoStatus={display.saldoStatus}
          saldoStatusText={display.saldoStatusText}
        />
      )}

      {/* Debug Info - Only in development */}
      {showDebug && (
        <DebugInfo
          quotation={quotation}
          displayData={displayData}
        />
      )}
    </div>
  );
}

/**
 * TotalLine Component
 * Displays a single line item (label + amount)
 */
function TotalLine({ label, amount, className = '', emphasis = false }) {
  return (
    <div className={`total-line ${className} ${emphasis ? 'emphasis' : ''}`}>
      <span className="label">{label}</span>
      <span className="amount">{amount}</span>
    </div>
  );
}

/**
 * IVASection Component
 * Displays IVA information with appropriate wording
 */
function IVASection({ ivaPercentage, ivaAmount, ivaNote, ivaMode }) {
  if (ivaPercentage === 0) {
    // No IVA
    return null;
  }

  if (ivaMode === 'INCLUDED') {
    // IVA is already included, show as note
    return (
      <div className="iva-section included">
        <div className="iva-note">
          <span className="icon">ℹ️</span>
          <span>{ivaNote}</span>
        </div>
      </div>
    );
  }

  // IVA is additional
  return (
    <div className="iva-section additional">
      <TotalLine
        label={`IVA (${ivaPercentage}%)`}
        amount={ivaAmount}
        className="iva"
      />
      <div className="iva-note">
        <small>{ivaNote}</small>
      </div>
    </div>
  );
}

/**
 * BalanceSection Component
 * Displays anticipo and saldo
 */
function BalanceSection({ anticipo, saldo, saldoStatus, saldoStatusText }) {
  const statusClass = saldoStatus === 'PENDING_PAYMENT' ? 'pending' : 'paid';

  return (
    <div className="balance-section">
      <hr className="divider" />
      <TotalLine
        label="Anticipo"
        amount={`-${anticipo}`}
        className="anticipo"
      />
      <TotalLine
        label="Saldo Pendiente"
        amount={saldo}
        className={`saldo ${statusClass}`}
      />
      <div className="saldo-status">
        <small>{saldoStatusText}</small>
      </div>
    </div>
  );
}

/**
 * ErrorBox Component
 * Shows validation errors in a user-friendly way
 */
function ErrorBox({ title, errors, folio }) {
  return (
    <div className="error-box quotation-error">
      <div className="error-header">
        <span className="error-icon">⚠️</span>
        <h3>{title}</h3>
      </div>

      <div className="error-body">
        <p className="subtitle">
          Se detectaron errores en los cálculos de la cotización:
        </p>

        <ul className="error-list">
          {errors.map((error, index) => (
            <li key={index} className="error-item">
              <span className="bullet">•</span>
              <span className="text">{error}</span>
            </li>
          ))}
        </ul>

        <div className="error-footer">
          <p className="action">
            Por favor, <strong>contacte al equipo de soporte</strong>
          </p>
          {folio && (
            <p className="reference">
              Referencia: <code>{folio}</code>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * DebugInfo Component
 * Shows detailed debug information (only in dev mode)
 */
function DebugInfo({ quotation }) {
  return (
    <div className="debug-info">
      <hr className="divider" />
      <details>
        <summary>🔍 Información de Debug</summary>
        <div className="debug-content">
          <h4>Valores Brutos</h4>
          <table>
            <tbody>
              <tr>
                <td>subtotal:</td>
                <td><code>{quotation.subtotal}</code></td>
              </tr>
              <tr>
                <td>ivaPct:</td>
                <td><code>{quotation.ivaPct}%</code></td>
              </tr>
              <tr>
                <td>ivaMonto:</td>
                <td><code>{quotation.ivaMonto}</code></td>
              </tr>
              <tr>
                <td>incluyeIva:</td>
                <td><code>{quotation.incluyeIva ? 'true' : 'false'}</code></td>
              </tr>
              <tr>
                <td>total:</td>
                <td><code>{quotation.total}</code></td>
              </tr>
            </tbody>
          </table>

          <h4>Modo IVA</h4>
          <p>
            {quotation.incluyeIva
              ? '✅ IVA incluido en precio (no se suma)'
              : '➕ IVA adicional (se suma a subtotal)'}
          </p>

          <h4>Items ({quotation.items?.length || 0})</h4>
          {quotation.items && quotation.items.length > 0 ? (
            <ul className="items-list">
              {quotation.items.map((item, i) => (
                <li key={i}>
                  {item.nombre} - ${item.precio} × {item.cantidad}
                  {item.applyDurationMultiplier && ' (×días)'}
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay items</p>
          )}
        </div>
      </details>
    </div>
  );
}

export default QuotationTotals;

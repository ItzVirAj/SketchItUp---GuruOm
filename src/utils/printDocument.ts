/**
 * Utility for printing specific DOM elements cleanly without interference from
 * outer fixed modal containers, overflow-hidden wrappers, or dark mode styling.
 */
export function printElementById(elementId: string, title?: string): void {
  const target = document.getElementById(elementId);
  if (!target) {
    console.warn(`[printDocument] Element with id "${elementId}" not found, falling back to window.print()`);
    window.print();
    return;
  }

  // Create an invisible iframe attached to body
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.warn('[printDocument] Unable to access iframe document, falling back to window.print()');
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  // Collect all stylesheet links and style tags from parent window
  const styleNodes = document.querySelectorAll('link[rel="stylesheet"], style');
  let stylesHtml = '';
  styleNodes.forEach(node => {
    stylesHtml += node.outerHTML;
  });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title || 'Print Document'}</title>
        ${stylesHtml}
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-size: 10pt !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-clean-box {
            border: 1.5pt solid #000000 !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 10pt !important;
            box-shadow: none !important;
          }
          .print-clean-box,
          .print-clean-box * {
            color: #000000 !important;
            border-color: #333333 !important;
            text-shadow: none !important;
          }
          .print-clean-box th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-clean-box td {
            background-color: transparent !important;
            color: #000000 !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1pt solid #333333 !important;
            padding: 4pt 6pt !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; max-width: 100%; margin: 0 auto;">
          ${target.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Short delay to ensure styles are loaded in iframe before printing
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (printErr) {
      console.error('[printDocument] Print error:', printErr);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  }, 250);
}

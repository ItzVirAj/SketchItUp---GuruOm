import React from 'react';
import {
  CustomerInvoice,
  CustomerOrder,
  DispatchChallan,
  CustomerMaster,
  CompanyProfile,
  InvoiceItem
} from '../../../types/console';

export interface TaxInvoicePrintProps {
  invoice: CustomerInvoice;
  order?: CustomerOrder | null;
  dispatch?: DispatchChallan | null;
  customer?: CustomerMaster | null;
  companyProfile?: CompanyProfile | null;
}

/**
 * Converts numbers into Indian currency words
 * e.g. 145000 -> "One Lakh Forty Five Thousand Rupees Only"
 */
export function numberToIndianRupeesWords(amount: number): string {
  const rounded = Math.round(Number(amount || 0));
  if (rounded === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return units[n];
    const unitPart = units[n % 10] ? ` ${units[n % 10]}` : '';
    return tens[Math.floor(n / 10)] + unitPart;
  }

  function convertThreeDigits(n: number): string {
    const hundredPart = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundredPart > 0) {
      str += `${units[hundredPart]} Hundred`;
      if (rest > 0) str += ` and ${convertTwoDigits(rest)}`;
    } else {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  let crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  let hundreds = remainder % 1000;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${convertThreeDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertTwoDigits(thousand)} Thousand`);
  if (hundreds > 0) parts.push(convertThreeDigits(hundreds));

  return `${parts.join(' ').trim()} Rupees Only`;
}

export const TaxInvoicePrint: React.FC<TaxInvoicePrintProps> = ({
  invoice,
  order,
  dispatch,
  customer,
  companyProfile
}) => {
  // Formatters
  const now = new Date();
  const printTimestamp = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Company Information
  const legalName = companyProfile?.legalName || 'GuruOm Industries LLP';
  const companyAddress = companyProfile?.address || 'Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India';
  const companyPhone = companyProfile?.phone || '+91 9763 969 798';
  const companyEmail = companyProfile?.email || 'contact@guruom.in';
  const companyGstin = companyProfile?.gstin || '27AABCG1234F1Z5';
  const companyPan = companyProfile?.pan || 'AABCG1234F';

  // Customer Information
  const customerName = invoice.customerName || order?.customerName || customer?.name || 'Customer';
  const customerGstin = invoice.customerGstin || order?.customerGstin || customer?.gstin || '27AABCT1234F1Z8';
  const customerAddress = customer?.address || order?.billingAddress || order?.shippingAddress || 'Plot 12, Pimpri Industrial Zone, Pune, Maharashtra 411018';
  const customerState = customer?.state || 'Maharashtra';
  const customerStateCode = customerGstin ? customerGstin.substring(0, 2) : '27';
  const isIntraState = customerStateCode === '27';

  // Resolve Line Items
  const rawItems: InvoiceItem[] = (invoice.items && invoice.items.length > 0)
    ? invoice.items
    : (order?.lines && order.lines.length > 0)
    ? order.lines.map((l: any) => ({
        itemCode: l.partCode || l.itemCode || 'PART-001',
        itemDescription: l.partDescription || l.itemDescription || 'Precision Machined Component',
        hsnCode: l.hsnCode || '84834000',
        qty: Number(l.orderQty || l.qty || 1),
        unitPrice: Number(l.rate || l.unitPrice || (invoice.taxableAmount ? (invoice.taxableAmount / (l.orderQty || 1)) : 100)),
        taxableValue: Number(l.qty || 1) * Number(l.unitPrice || 100),
        gstRate: 18
      }))
    : [
        {
          itemCode: 'FG-0001',
          itemDescription: 'Heavy Duty Mounting Bracket (Precision CNC Machined)',
          hsnCode: '84834000',
          qty: 100,
          unitPrice: Number(invoice.taxableAmount || 122881.50) / 100,
          taxableValue: Number(invoice.taxableAmount || 122881.50),
          gstRate: 18
        }
      ];

  // Financial Figures
  const taxable = Number(invoice.taxableAmount ?? (Number(invoice.totalAmount || 0) / 1.18));
  const cgst = isIntraState ? Number(invoice.cgstAmount ?? (taxable * 0.09)) : 0;
  const sgst = isIntraState ? Number(invoice.sgstAmount ?? (taxable * 0.09)) : 0;
  const igst = !isIntraState ? Number(invoice.igstAmount ?? (taxable * 0.18)) : 0;
  const grandTotal = Number(invoice.totalAmount || (taxable + cgst + sgst + igst));
  const paid = Number(invoice.paidAmount || 0);
  const balance = Number(invoice.balanceAmount !== undefined ? invoice.balanceAmount : Math.max(0, grandTotal - paid));
  const isSettled = invoice.status === 'PAID' || invoice.status === 'SETTLED' || balance <= 0;

  return (
    <div
      className="print-clean-box bg-white text-slate-900 border border-slate-400 p-5 sm:p-6 text-xs font-sans space-y-4 shadow-sm"
      style={{ color: '#0f172a', background: '#ffffff' }}
    >
      {/* ========================================================================= */}
      {/* 1. OFFICIAL STATUTORY LETTERHEAD & DOCUMENT TITLE (JobCard Print Style) */}
      {/* ========================================================================= */}
      <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-950">
            {legalName}
          </h1>
          <p className="text-[11px] text-slate-700 max-w-xl leading-relaxed">
            {companyAddress}
          </p>
          <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-600 font-mono mt-0.5">
            <span><strong>GSTIN:</strong> {companyGstin}</span>
            <span><strong>PAN:</strong> {companyPan}</span>
            <span><strong>State Code:</strong> 27 (Maharashtra)</span>
            <span>{companyPhone}</span>
            <span>Email: {companyEmail}</span>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l sm:border-slate-300 pt-2 sm:pt-0 sm:pl-4">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-900 border border-slate-900 px-2 py-0.5 inline-block bg-slate-100">
            TAX INVOICE (GST RULE 46)
          </div>
          <div className="text-xs font-mono font-bold text-slate-900 mt-1">
            Invoice #: <span className="text-sm font-black">{invoice.invoiceNo}</span>
          </div>
          <div className="text-[10px] font-mono text-slate-600">
            Doc Ref: GOM-FIN-INV-01 • Print: {printTimestamp}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATUTORY INVOICE & CUSTOMER METADATA (TABULAR FORMAT) */}
      {/* ========================================================================= */}
      <table className="w-full text-left text-[11px] border-collapse border border-slate-400 font-mono">
        <tbody>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5 w-1/6">Buyer / Customer</td>
            <td className="border border-slate-300 p-1.5 w-2/6 font-semibold">{customerName}</td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5 w-1/6">Invoice Number</td>
            <td className="border border-slate-300 p-1.5 w-2/6 font-black text-slate-950">{invoice.invoiceNo}</td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Billing Address</td>
            <td className="border border-slate-300 p-1.5 text-[10px]">{customerAddress}</td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Invoice Date</td>
            <td className="border border-slate-300 p-1.5 font-bold">{formatDateOnly(invoice.date || invoice.invoiceDate)}</td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Buyer GSTIN</td>
            <td className="border border-slate-300 p-1.5 font-bold">{customerGstin}</td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Payment Due Date</td>
            <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{formatDateOnly(invoice.dueDate)}</td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">State & Code</td>
            <td className="border border-slate-300 p-1.5">{customerState} (Code: {customerStateCode})</td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Customer PO #</td>
            <td className="border border-slate-300 p-1.5 font-bold">{invoice.orderPo}</td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Dispatch Challan #</td>
            <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{invoice.challanNo || dispatch?.challanNo || 'CHL-DIRECT'}</td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Place of Supply</td>
            <td className="border border-slate-300 p-1.5">{customerState} (27)</td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Payment Terms</td>
            <td className="border border-slate-300 p-1.5">30 Days Net (Standard Credit)</td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Reverse Charge</td>
            <td className="border border-slate-300 p-1.5">No</td>
          </tr>
        </tbody>
      </table>

      {/* ========================================================================= */}
      {/* 3. LINE ITEMS SCHEDULE (ITEMIZED TAX BREAKDOWN) */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[11px] font-mono font-bold uppercase text-slate-900 border-b border-slate-300 pb-1">
          <span>Itemized Description of Goods & Services</span>
          <span className="text-[10px] text-slate-600 font-normal">GST HSN Chapter 84 / 85 Precision Components</span>
        </div>

        <table className="w-full text-left text-[10px] border-collapse border border-slate-400 font-mono">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold text-center">
              <th className="border border-slate-400 p-1.5 w-8">#</th>
              <th className="border border-slate-400 p-1.5 text-left w-32">Item Code</th>
              <th className="border border-slate-400 p-1.5 text-left">Description of Goods</th>
              <th className="border border-slate-400 p-1.5 w-20">HSN Code</th>
              <th className="border border-slate-400 p-1.5 w-16 text-right">Qty</th>
              <th className="border border-slate-400 p-1.5 w-14">Unit</th>
              <th className="border border-slate-400 p-1.5 w-24 text-right">Rate (₹)</th>
              <th className="border border-slate-400 p-1.5 w-28 text-right">Taxable Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rawItems.map((item, idx) => {
              const lineTaxable = Number(item.taxableValue ?? (item.qty * item.unitPrice));
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="border border-slate-400 p-1.5 text-center font-bold">{idx + 1}</td>
                  <td className="border border-slate-400 p-1.5 font-bold text-slate-950">{item.itemCode}</td>
                  <td className="border border-slate-400 p-1.5 font-sans font-medium">{item.itemDescription}</td>
                  <td className="border border-slate-400 p-1.5 text-center">{item.hsnCode || '84834000'}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-bold">{item.qty}</td>
                  <td className="border border-slate-400 p-1.5 text-center">NOS</td>
                  <td className="border border-slate-400 p-1.5 text-right">₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-bold text-slate-950">
                    ₹{lineTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 4. STATUTORY TAX CALCULATION & TOTALS SUMMARY */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Settlement Status & Amount in Words */}
        <div className="p-3 border border-slate-400 bg-slate-50 space-y-2 text-[11px] font-mono">
          <div>
            <span className="font-bold text-slate-800 uppercase block text-[10px]">Amount Chargeable (in words):</span>
            <span className="font-semibold text-slate-950 italic">{numberToIndianRupeesWords(grandTotal)}</span>
          </div>

          <div className="pt-2 border-t border-slate-300">
            <span className="font-bold text-slate-800 uppercase block text-[10px]">Payment Realization Status:</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-sm font-bold text-[10px] uppercase border ${
                isSettled
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                  : 'bg-amber-100 text-amber-800 border-amber-400'
              }`}>
                {isSettled ? '✓ SETTLED / FULLY PAID' : '⏳ BALANCE OUTSTANDING'}
              </span>
              <span className="text-[10px] text-slate-600">
                Paid: ₹{paid.toLocaleString('en-IN', { maximumFractionDigits: 0 })} • Bal: ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-600 space-y-0.5 pt-1">
            <div>Bank: <strong>HDFC Bank Ltd</strong> (Current A/c: 50200012345678)</div>
            <div>IFSC: <strong>HDFC0001234</strong> • Branch: Pune Industrial Area</div>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <table className="w-full text-[11px] border-collapse border border-slate-400 font-mono">
          <tbody>
            <tr>
              <td className="bg-slate-100 font-bold border border-slate-300 p-1.5 w-1/2">Total Taxable Value</td>
              <td className="border border-slate-300 p-1.5 text-right font-bold">
                ₹{taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
            {isIntraState ? (
              <>
                <tr>
                  <td className="border border-slate-300 p-1.5 text-slate-700">Central GST (CGST @ 9%)</td>
                  <td className="border border-slate-300 p-1.5 text-right">
                    ₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-1.5 text-slate-700">State GST (SGST @ 9%)</td>
                  <td className="border border-slate-300 p-1.5 text-right">
                    ₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td className="border border-slate-300 p-1.5 text-slate-700">Integrated GST (IGST @ 18%)</td>
                <td className="border border-slate-300 p-1.5 text-right">
                  ₹{igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            )}
            <tr className="bg-slate-100">
              <td className="border border-slate-400 p-2 font-black text-sm text-slate-950 uppercase">
                Grand Total (₹)
              </td>
              <td className="border border-slate-400 p-2 text-right font-black text-base text-slate-950">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 5. STATUTORY DECLARATION & AUTHORIZED SIGNATURE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-400 text-[10px] font-mono">
        <div>
          <span className="font-bold block uppercase text-slate-800">Declaration:</span>
          <p className="text-slate-600 leading-tight mt-0.5">
            We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            Goods once sold will not be taken back or exchanged. Interest @ 18% p.a. will be charged if payment is delayed beyond credit terms.
            Subject to Pune Jurisdiction.
          </p>
        </div>

        <div className="text-right flex flex-col justify-between items-end">
          <div className="font-bold text-slate-900">
            For {legalName.toUpperCase()}
          </div>
          <div className="pt-8 border-t border-slate-400 text-center w-48">
            <span className="font-bold block text-slate-900">Authorized Signatory</span>
            <span className="text-[9px] text-slate-500">Commercial & Accounts Dept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxInvoicePrint;

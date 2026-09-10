import { GoogleGenAI } from '@google/genai';
import { ENV } from '../../config/env';
import { validateMagicBytes } from '../../middleware/upload.middleware';

export class ReceiptScanNotConfiguredError extends Error {
  statusCode = 503;
  constructor(message = 'AI receipt scanning is not configured on this server. Set GEMINI_API_KEY to enable it.') {
    super(message);
    this.name = 'ReceiptScanNotConfiguredError';
  }
}

export class ReceiptScanFailedError extends Error {
  statusCode = 422;
  constructor(message = 'Could not extract data from this document. Please enter the bill details manually.') {
    super(message);
    this.name = 'ReceiptScanFailedError';
  }
}

const VENDOR_TYPES = ['Supplier', 'Subcontractor / Job Worker', 'Transporter', 'Manpower Provider', 'Other'] as const;

export interface ExtractedVendorBillFields {
  vendorName: string | null;
  vendorType: (typeof VENDOR_TYPES)[number] | null;
  vendorPan: string | null;
  billNo: string | null;
  date: string | null; // YYYY-MM-DD
  dueDate: string | null; // YYYY-MM-DD
  grossAmount: number | null;
  currency: string | null;
  gstNumber: string | null;
  lineItems: { description: string; amount: number }[];
  notes: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const EXTRACTION_PROMPT = `You are an accounts-payable clerk extracting data from a vendor bill, supplier invoice, or purchase receipt image/PDF for an Indian manufacturing company's accounting system.

Read the document carefully and return ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "vendorName": string or null,          // the SELLER / supplier / biller name (not the buyer)
  "vendorType": one of ${JSON.stringify(VENDOR_TYPES)} or null,  // best guess based on what was purchased
  "vendorPan": string or null,           // vendor's PAN if visible (10-char alphanumeric, e.g. AAACM1234F)
  "billNo": string or null,              // the invoice/bill number printed on the document
  "date": string or null,                // bill/invoice date, formatted strictly as YYYY-MM-DD
  "dueDate": string or null,             // payment due date if printed, formatted strictly as YYYY-MM-DD, else null
  "grossAmount": number or null,         // final total payable amount (numeric, no currency symbols or commas)
  "currency": string or null,            // ISO currency code, e.g. "INR", "USD"
  "gstNumber": string or null,           // vendor's GSTIN if visible (15-char)
  "lineItems": [ { "description": string, "amount": number } ],  // itemised charges if visible, else []
  "notes": string or null,               // anything unusual worth a human's attention (illegible, foreign currency, damaged, etc.)
  "confidence": "high" | "medium" | "low"  // your confidence in the extracted amount and date being correct
}

Rules:
- If a field is not visible or not present on the document, use null (or [] for lineItems). Never guess or invent values.
- "date" and "dueDate" MUST be valid ISO YYYY-MM-DD strings or null — never any other format.
- "grossAmount" MUST be a plain number (e.g. 15000.50), never a string, never include currency symbols.
- Return raw JSON only.`;

export class ReceiptScanService {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!ENV.GEMINI_API_KEY) {
      throw new ReceiptScanNotConfiguredError();
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
    }
    return this.client;
  }

  /**
   * Sends a receipt/invoice image or PDF to Gemini vision and returns structured,
   * best-effort extracted fields for pre-filling the vendor bill form.
   * The caller is responsible for treating this as a *draft* — nothing here is
   * persisted or trusted as authoritative; the human always reviews before saving.
   */
  async extractVendorBillFields(buffer: Buffer, declaredFilename: string): Promise<ExtractedVendorBillFields> {
    const { mime } = await validateMagicBytes(buffer, declaredFilename);

    const allowedForVision = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
    if (!allowedForVision.has(mime)) {
      throw new ReceiptScanFailedError(`Unsupported file type for AI scanning: ${mime}. Please upload a PDF, PNG, JPG, or WEBP.`);
    }

    const client = this.getClient();
    const base64Data = buffer.toString('base64');

    let response;
    try {
      response = await client.models.generateContent({
        model: ENV.GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType: mime, data: base64Data } }, { text: EXTRACTION_PROMPT }]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });
    } catch (err: any) {
      console.warn('⚠️ [ReceiptScan] Gemini request failed:', err?.message);
      throw new ReceiptScanFailedError('AI document scan failed. Please enter the bill details manually.');
    }

    const rawText = response.text;
    if (!rawText) {
      throw new ReceiptScanFailedError();
    }

    return this.parseAndValidate(rawText);
  }

  private parseAndValidate(rawText: string): ExtractedVendorBillFields {
    let parsed: any;
    try {
      const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new ReceiptScanFailedError('AI response could not be parsed. Please enter the bill details manually.');
    }

    const isoDate = /^\d{4}-\d{2}-\d{2}$/;

    const result: ExtractedVendorBillFields = {
      vendorName: typeof parsed.vendorName === 'string' && parsed.vendorName.trim() ? parsed.vendorName.trim().slice(0, 200) : null,
      vendorType: VENDOR_TYPES.includes(parsed.vendorType) ? parsed.vendorType : null,
      vendorPan: typeof parsed.vendorPan === 'string' && parsed.vendorPan.trim() ? parsed.vendorPan.trim().toUpperCase().slice(0, 10) : null,
      billNo: typeof parsed.billNo === 'string' && parsed.billNo.trim() ? parsed.billNo.trim().slice(0, 100) : null,
      date: typeof parsed.date === 'string' && isoDate.test(parsed.date) ? parsed.date : null,
      dueDate: typeof parsed.dueDate === 'string' && isoDate.test(parsed.dueDate) ? parsed.dueDate : null,
      grossAmount: typeof parsed.grossAmount === 'number' && isFinite(parsed.grossAmount) && parsed.grossAmount >= 0 ? parsed.grossAmount : null,
      currency: typeof parsed.currency === 'string' && parsed.currency.trim() ? parsed.currency.trim().toUpperCase().slice(0, 6) : null,
      gstNumber: typeof parsed.gstNumber === 'string' && parsed.gstNumber.trim() ? parsed.gstNumber.trim().toUpperCase().slice(0, 15) : null,
      lineItems: Array.isArray(parsed.lineItems)
        ? parsed.lineItems
            .filter((li: any) => li && typeof li.description === 'string' && typeof li.amount === 'number')
            .slice(0, 50)
            .map((li: any) => ({ description: String(li.description).slice(0, 300), amount: Number(li.amount) }))
        : [],
      notes: typeof parsed.notes === 'string' && parsed.notes.trim() ? parsed.notes.trim().slice(0, 500) : null,
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low'
    };

    return result;
  }
}

export const receiptScanService = new ReceiptScanService();

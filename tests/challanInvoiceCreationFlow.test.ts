import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateGstTaxSplit, getCurrentFinancialYear, formatDocumentNumber } from '../src/utils/statutoryAccountingEngine';
import { InvoicesService } from '../backend/src/modules/invoices/invoices.service';
import { DispatchService } from '../backend/src/modules/dispatch/dispatch.service';
import { notificationsService } from '../backend/src/modules/notifications/notifications.service';
import { ordersService } from '../backend/src/modules/orders/orders.service';
import { qcService } from '../backend/src/modules/qc/qc.service';

describe('Challan & Invoice Creation Flow (Stage 9a & Stage 9)', () => {
  let invoicesService: InvoicesService;
  let dispatchService: DispatchService;
  let broadcastSpy: any;

  beforeEach(() => {
    invoicesService = new InvoicesService();
    dispatchService = new DispatchService();
    broadcastSpy = vi.spyOn(notificationsService, 'broadcastEvent').mockImplementation(() => {});
  });

  describe('1. Statutory GST Calculation Engine (Intra-State vs Inter-State)', () => {
    it('correctly calculates intra-state GST (CGST 9% + SGST 9%) for Maharashtra (State 27)', () => {
      const result = calculateGstTaxSplit({
        taxableAmount: 10000,
        gstRate: 18,
        buyerGstin: '27AABCG1234F1Z5', // Maharashtra buyer
        sellerStateCode: '27'
      });

      expect(result.isIntraState).toBe(true);
      expect(result.buyerStateCode).toBe('27');
      expect(result.cgstRate).toBe(9);
      expect(result.sgstRate).toBe(9);
      expect(result.igstRate).toBe(0);
      expect(result.cgstAmount).toBe(900);
      expect(result.sgstAmount).toBe(900);
      expect(result.igstAmount).toBe(0);
      expect(result.totalGstAmount).toBe(1800);
      expect(result.totalAmount).toBe(11800);
    });

    it('correctly calculates inter-state GST (IGST 18%) for out-of-state buyers (e.g., Karnataka 29)', () => {
      const result = calculateGstTaxSplit({
        taxableAmount: 10000,
        gstRate: 18,
        buyerGstin: '29AABCG9876K1Z3', // Karnataka buyer
        sellerStateCode: '27'
      });

      expect(result.isIntraState).toBe(false);
      expect(result.buyerStateCode).toBe('29');
      expect(result.cgstRate).toBe(0);
      expect(result.sgstRate).toBe(0);
      expect(result.igstRate).toBe(18);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstAmount).toBe(1800);
      expect(result.totalGstAmount).toBe(1800);
      expect(result.totalAmount).toBe(11800);
    });

    it('generates compliant FY code and document numbers', () => {
      const fy = getCurrentFinancialYear();
      expect(fy).toMatch(/^[0-9]{4}$/); // e.g. "2627" or "2526"
      const docNo = formatDocumentNumber('INV', fy, 42);
      expect(docNo).toBe(`INV-${fy}-0042`);
    });
  });

  describe('2. Backend Invoices Service & Stage Machine Verification', () => {
    it('creates an invoice in DRAFT status and broadcasts invoice_created', async () => {
      const uniquePo = `PO-TEST-INV-${Date.now()}`;
      
      // Mock order in READY_TO_DISPATCH / DISPATCHED state
      vi.spyOn(ordersService, 'getOrderById').mockResolvedValue({
        id: uniquePo,
        poNo: uniquePo,
        customerName: 'Tata Motors Pune',
        customerGstin: '27AABCT1234F1Z8',
        status: 'DISPATCHED',
        stage: 'DISPATCHED',
        lines: [
          {
            id: 'line-1',
            itemCode: 'GEAR-PINION-01',
            description: 'Machined Gear Pinion',
            orderQty: 10,
            dispatchedQty: 10,
            unitPrice: 1500
          }
        ]
      } as any);

      const invoice = await invoicesService.createInvoice({
        customerName: 'Tata Motors Pune',
        customerGstin: '27AABCT1234F1Z8',
        orderPo: uniquePo,
        challanNo: `CHL-${Date.now()}`,
        status: 'DRAFT',
        items: [
          {
            itemCode: 'GEAR-PINION-01',
            itemDescription: 'Machined Gear Pinion',
            hsnCode: '84834000',
            qty: 10,
            unitPrice: 1500,
            gstRate: 18
          }
        ]
      } as any, 'finance@guruom.in');

      expect(invoice).toBeDefined();
      expect(invoice.status).toBe('DRAFT');
      expect(invoice.taxableAmount).toBe(15000);
      expect(invoice.cgstAmount).toBe(1350);
      expect(invoice.sgstAmount).toBe(1350);
      expect(invoice.totalAmount).toBe(17700);

      // Verify real-time broadcast
      expect(broadcastSpy).toHaveBeenCalledWith('invoice_created', expect.objectContaining({
        status: 'DRAFT',
        orderPo: uniquePo
      }));
    });

    it('issues a DRAFT invoice and transitions status to ISSUED and parent order to INVOICED', async () => {
      const uniquePo = `PO-TEST-ISSUE-${Date.now()}`;
      
      vi.spyOn(ordersService, 'getOrderById').mockResolvedValue({
        id: uniquePo,
        poNo: uniquePo,
        customerName: 'Bharat Forge Ltd',
        customerGstin: '27AABCB5678F1Z2',
        status: 'DISPATCHED',
        stage: 'DISPATCHED',
        lines: [
          {
            id: 'line-1',
            itemCode: 'SHAFT-01',
            description: 'Drive Shaft',
            orderQty: 5,
            dispatchedQty: 5,
            unitPrice: 2000
          }
        ]
      } as any);

      const draftInvoice = await invoicesService.createInvoice({
        customerName: 'Bharat Forge Ltd',
        customerGstin: '27AABCB5678F1Z2',
        orderPo: uniquePo,
        challanNo: `CHL-${Date.now()}`,
        status: 'DRAFT',
        items: [
          {
            itemCode: 'SHAFT-01',
            itemDescription: 'Drive Shaft',
            hsnCode: '84834000',
            qty: 5,
            unitPrice: 2000,
            gstRate: 18
          }
        ]
      } as any, 'finance@guruom.in');

      expect(draftInvoice.status).toBe('DRAFT');

      // Now issue the invoice
      const issuedInvoice = await invoicesService.issueInvoice(draftInvoice.invoiceNo, 'Accounts Head');
      expect(issuedInvoice.status).toBe('ISSUED');

      // Check real-time broadcast of invoice_updated and order_transitioned
      expect(broadcastSpy).toHaveBeenCalledWith('invoice_updated', expect.objectContaining({
        status: 'ISSUED',
        invoiceNo: draftInvoice.invoiceNo
      }));
      expect(broadcastSpy).toHaveBeenCalledWith('order_transitioned', expect.objectContaining({
        status: 'INVOICED',
        progressStep: 8,
        invoiceNo: draftInvoice.invoiceNo
      }));
    });

    it('rejects invoice generation when order is in early pre-dispatch stage (State Machine Enforcement)', async () => {
      const uniquePo = `PO-TEST-EARLY-${Date.now()}`;
      
      vi.spyOn(ordersService, 'getOrderById').mockResolvedValue({
        id: uniquePo,
        poNo: uniquePo,
        customerName: 'Kalyani Steels',
        customerGstin: '27AABCK1234F1Z1',
        status: 'IN_PRODUCTION',
        stage: 'IN_PRODUCTION',
        lines: [{ id: 'line-1', itemCode: 'ITEM-01', orderQty: 10, dispatchedQty: 0, unitPrice: 1000 }]
      } as any);

      await expect(
        invoicesService.createInvoice({
          customerName: 'Kalyani Steels',
          customerGstin: '27AABCK1234F1Z1',
          orderPo: uniquePo,
          status: 'DRAFT',
          items: [{ itemCode: 'ITEM-01', itemDescription: 'Item', hsnCode: '84834000', qty: 10, unitPrice: 1000, gstRate: 18 }]
        } as any, 'finance@guruom.in')
      ).rejects.toThrow(/State Machine Gate Blocked/);
    });

    it('prevents over-invoicing when invoice quantity exceeds physically dispatched quantity', async () => {
      const uniquePo = `PO-TEST-OVERINV-${Date.now()}`;
      
      vi.spyOn(ordersService, 'getOrderById').mockResolvedValue({
        id: uniquePo,
        poNo: uniquePo,
        customerName: 'Thermax India',
        customerGstin: '27AABCT9999F1Z0',
        status: 'PARTIALLY_DISPATCHED',
        stage: 'PARTIALLY_DISPATCHED',
        lines: [{ id: 'line-1', itemCode: 'VALVE-01', orderQty: 20, dispatchedQty: 5, unitPrice: 1000 }]
      } as any);

      await expect(
        invoicesService.createInvoice({
          customerName: 'Thermax India',
          customerGstin: '27AABCT9999F1Z0',
          orderPo: uniquePo,
          status: 'DRAFT',
          items: [{ itemCode: 'VALVE-01', itemDescription: 'Valve', hsnCode: '84834000', qty: 15, unitPrice: 1000, gstRate: 18 }]
        } as any, 'finance@guruom.in')
      ).rejects.toThrow(/Commercial Gate Blocked: Total invoice quantity/);
    });
  });

  describe('3. Dispatch Eligibility Gate (PDI / QC Clearance)', () => {
    it('blocks dispatch creation if order has not cleared PDI inspection', async () => {
      const uniquePo = `PO-TEST-PDI-GATE-${Date.now()}`;
      vi.spyOn(qcService, 'checkDispatchEligibility').mockResolvedValue({
        orderPo: uniquePo,
        eligible: false,
        passedPdiCount: 0,
        pendingQcCount: 0,
        pendingPdiCount: 1,
        reasons: ['1 PDI compliance certificate(s) pending.']
      });

      await expect(
        dispatchService.createDispatch({
          challanNo: `CHL-${Date.now()}`,
          orderPo: uniquePo,
          status: 'DISPATCHED',
          date: '2026-08-19',
          transporter: 'VRL Logistics',
          vehicleNo: 'MH 12 AB 1234'
        } as any)
      ).rejects.toThrow(/Dispatch rejected by Quality Gatekeeper/);
    });
  });
});

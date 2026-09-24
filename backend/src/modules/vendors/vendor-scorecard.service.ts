import { getDbClient } from '../../config/database';
import { computeVendorScorecard, VendorPerformanceMetric } from '../../../../src/utils/procurementEngine';

export class VendorScorecardService {
  private db = getDbClient();

  async getVendorScorecard(vendorCode: string): Promise<VendorPerformanceMetric> {
    const currentYear = new Date().getFullYear();
    const evaluationPeriod = `FY ${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

    try {
      // 1. Fetch vendor master details
      const { data: vendorData } = await this.db
        .from('vendor_masters')
        .select('*')
        .eq('code', vendorCode)
        .maybeSingle();

      const supplierName = vendorData?.name || vendorCode;

      // 2. Fetch all GRNs for this vendor (by code or vendor_name)
      const { data: grnData } = await this.db
        .from('goods_receipt_notes')
        .select('*')
        .or(`vendor_code.eq.${vendorCode},vendor_name.ilike.%${supplierName}%`);

      if (!grnData || grnData.length === 0) {
        return computeVendorScorecard(vendorCode, supplierName, evaluationPeriod, []);
      }

      const grnIds = grnData.map((g: any) => g.id);
      const { data: grnItems } = await this.db
        .from('grn_items')
        .select('*')
        .in('grn_id', grnIds);

      // 3. Fetch originating POs for these GRNs
      const poNumbers = Array.from(new Set(grnData.map((g: any) => g.po_no).filter(Boolean)));
      const poMap: Record<string, any> = {};
      if (poNumbers.length > 0) {
        const { data: poData } = await this.db
          .from('purchase_orders')
          .select('*')
          .in('po_no', poNumbers);
        if (poData) {
          for (const po of poData) {
            poMap[po.po_no] = po;
          }
        }
      }

      // 4. Assemble deliveries array
      const deliveries = grnData.map((grn: any) => {
        const linkedPo = grn.po_no ? poMap[grn.po_no] : null;
        const committedDate = linkedPo?.expected_delivery_date || grn.received_date || grn.challan_date || new Date().toISOString().split('T')[0];
        const actualDeliveryDate = grn.received_date || grn.challan_date || new Date().toISOString().split('T')[0];

        const items = (grnItems || []).filter((i: any) => i.grn_id === grn.id);
        const receivedQty = items.reduce((acc: number, item: any) => acc + Number(item.received_qty || 0), 0);
        const acceptedQty = items.reduce((acc: number, item: any) => acc + Number(item.accepted_qty || 0), 0);
        const rejectedQty = items.reduce((acc: number, item: any) => acc + Number(item.rejected_qty || 0), 0);

        return {
          committedDate,
          actualDeliveryDate,
          receivedQty,
          acceptedQty,
          rejectedQty
        };
      });

      return computeVendorScorecard(vendorCode, supplierName, evaluationPeriod, deliveries);
    } catch (err) {
      console.warn(`[VendorScorecardService] Error computing scorecard for ${vendorCode}:`, err);
      return computeVendorScorecard(vendorCode, vendorCode, evaluationPeriod, []);
    }
  }
}

export const vendorScorecardService = new VendorScorecardService();

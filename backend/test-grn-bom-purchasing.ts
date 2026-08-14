import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { generateTokens } from './src/utils/jwt';
import grnRoutes from './src/modules/grn/grn.routes';
import bomRoutes from './src/modules/bom/bom.routes';
import purchasingRoutes from './src/modules/purchasing/purchasing.routes';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/v1/grn', grnRoutes);
app.use('/api/v1/bom', bomRoutes);
app.use('/api/v1/purchasing', purchasingRoutes);

const server = app.listen(3004, async () => {
  console.log('Test server running on port 3004 for GRN, BOM, Purchasing verification');

  try {
    const superAdminToken = generateTokens({
      id: 'usr-admin',
      email: 'admin@guruom.in',
      role: 'SUPER ADMIN',
      name: 'Pramod Parshi (Founder & CEO)'
    }).accessToken;

    const operatorToken = generateTokens({
      id: 'usr-op',
      email: 'operator@guruom.in',
      role: 'OPERATOR',
      name: 'Operator User'
    }).accessToken;

    const qcToken = generateTokens({
      id: 'usr-qc',
      email: 'qc@guruom.in',
      role: 'QC_MANAGER',
      name: 'QC Specialist'
    }).accessToken;

    console.log('\n--- 1. Testing Unauthenticated Access (401 Missing/Invalid Token) ---');
    const resUnauth = await fetch('http://localhost:3004/api/v1/grn');
    console.log('✓ GET /api/v1/grn without token status:', resUnauth.status, '(Expected: 401)');
    if (resUnauth.status !== 401) throw new Error('Expected 401 on missing auth');

    console.log('\n--- 2. Testing RBAC Role Restrictions (403 Forbidden) ---');
    // Operator trying to approve PO (restricted to SUPER ADMIN, FINANCE_MANAGER)
    const resRbacPoApprove = await fetch('http://localhost:3004/api/v1/purchasing/PO-PUR-2026-003/review', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({ decision: 'APPROVE' })
    });
    console.log('✓ PATCH /api/v1/purchasing/:id/review as OPERATOR status:', resRbacPoApprove.status, '(Expected: 403)');
    if (resRbacPoApprove.status !== 403) throw new Error('Expected 403 when OPERATOR attempts PO approval');

    console.log('\n--- 3. Testing Goods Receipt Notes (GRN) Operations ---');
    // Fetch GRN list
    const resGrnList = await fetch('http://localhost:3004/api/v1/grn', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const grnListData = await resGrnList.json();
    console.log('✓ GET /api/v1/grn status:', resGrnList.status, 'Total GRNs:', grnListData.data.length);

    // Create GRN
    const resCreateGrn = await fetch('http://localhost:3004/api/v1/grn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({
        grnNo: 'GRN-TEST-999',
        poNo: 'PO-PUR-2026-001',
        vendorCode: 'VEND-001',
        vendorName: 'Mahalaxmi Steel Traders',
        challanNo: 'CH-TEST-1234',
        receivedDate: '2026-08-14',
        receivedBy: 'Operator User',
        status: 'RECEIVED',
        items: [{
          itemCode: 'RAW-ALU-6061-ROD',
          itemDescription: 'Aluminium 6061 Round Bar',
          orderedQty: 100,
          receivedQty: 100,
          acceptedQty: 100,
          rejectedQty: 0,
          unit: 'KG',
          unitRate: 280
        }]
      })
    });
    console.log('✓ POST /api/v1/grn status:', resCreateGrn.status, '(Expected: 201)');
    if (resCreateGrn.status !== 201) throw new Error('Failed to create GRN');

    // QC Verify GRN
    const resQcVerify = await fetch('http://localhost:3004/api/v1/grn/GRN-TEST-999/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${qcToken}`
      },
      body: JSON.stringify({ status: 'QC_VERIFIED', remarks: 'Passed all lab dimensional checks' })
    });
    console.log('✓ PATCH /api/v1/grn/:id/status as QC_MANAGER status:', resQcVerify.status, '(Expected: 200)');
    if (resQcVerify.status !== 200) throw new Error('Failed to verify GRN');

    console.log('\n--- 4. Testing Bill of Materials (BOM) Operations ---');
    // Fetch BOMs
    const resBomList = await fetch('http://localhost:3004/api/v1/bom', {
      headers: { 'Authorization': `Bearer ${operatorToken}` }
    });
    const bomListData = await resBomList.json();
    console.log('✓ GET /api/v1/bom status:', resBomList.status, 'Total BOMs:', bomListData.data.length);

    // Create / Update BOM
    const resCreateBom = await fetch('http://localhost:3004/api/v1/bom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        bomCode: 'BOM-TEST-FLANGE-99',
        parentPartCode: 'FG-FLANGE-99',
        parentPartName: 'Custom Flange 99mm',
        revision: 'v1.0',
        yieldPercentage: 97.5,
        batchSize: 100,
        status: 'ACTIVE',
        notes: 'Test engineering specification',
        components: [
          {
            componentCode: 'RAW-ALU-6061-ROD',
            componentName: 'Aluminium 6061 Round Bar',
            componentType: 'RAW_MATERIAL',
            qtyPerUnit: 1.25,
            unit: 'KG',
            scrapAllowancePct: 2.5,
            stage: 'CNC_MACHINING',
            unitCost: 280
          }
        ]
      })
    });
    console.log('✓ POST /api/v1/bom status:', resCreateBom.status, '(Expected: 201)');
    if (resCreateBom.status !== 201) throw new Error('Failed to create BOM');

    console.log('\n--- 5. Testing Purchasing & Approval Workflow ---');
    // Create high-value PO (> ₹100,000 auto-flags PENDING_APPROVAL)
    const resCreatePo = await fetch('http://localhost:3004/api/v1/purchasing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        poNo: 'PO-PUR-TEST-888',
        supplierCode: 'VEND-001',
        supplierName: 'Mahalaxmi Steel Traders',
        orderDate: '2026-08-14',
        expectedDeliveryDate: '2026-08-30',
        paymentTerms: 'Net 30',
        taxRate: 18.0,
        notes: 'Test high value PO',
        items: [{
          itemCode: 'RAW-SS304-BAR-40MM',
          itemDescription: 'Stainless Steel 304 Round Bar Ø40mm',
          orderQty: 500,
          unit: 'KG',
          unitPrice: 380,
          lineTotal: 190000
        }]
      })
    });
    const createPoData = await resCreatePo.json();
    console.log('✓ POST /api/v1/purchasing status:', resCreatePo.status, 'Total Amount:', createPoData.data.totalAmount, 'Approval Status:', createPoData.data.approvalStatus);
    if (createPoData.data.approvalStatus !== 'PENDING') throw new Error('High value PO was not marked as PENDING approval');

    // Super Admin executes PO Approval
    const resApprovePo = await fetch(`http://localhost:3004/api/v1/purchasing/${createPoData.data.poNo}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ decision: 'APPROVE' })
    });
    const approveData = await resApprovePo.json();
    console.log('✓ PATCH /api/v1/purchasing/:id/review as SUPER ADMIN status:', resApprovePo.status, 'New Status:', approveData.data.status, 'Approved By:', approveData.data.approved_by);
    if (approveData.data.status !== 'APPROVED') throw new Error('PO was not approved successfully');

    console.log('\n=============================================================');
    console.log('🎉 GRN, BOM & PURCHASING REST API INTEGRATION TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (err: any) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close();
  }
});

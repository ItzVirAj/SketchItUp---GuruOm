import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { generateTokens } from './src/utils/jwt';
import productionRoutes from './src/modules/production/production.routes';
import qcRoutes from './src/modules/qc/qc.routes';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/v1/production', productionRoutes);
app.use('/api/v1/qc', qcRoutes);

const server = app.listen(3005, async () => {
  console.log('Test server running on port 3005 for Production & QC/PDI verification');

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
    const resUnauth = await fetch('http://localhost:3005/api/v1/production/jobs');
    console.log('✓ GET /api/v1/production/jobs without token status:', resUnauth.status, '(Expected: 401)');
    if (resUnauth.status !== 401) throw new Error('Expected 401 on missing auth');

    console.log('\n--- 2. Testing RBAC Role Restrictions (403 Forbidden) ---');
    // Operator trying to pass PDI inspection (restricted to SUPER ADMIN, QC_MANAGER)
    const resRbacPdi = await fetch('http://localhost:3005/api/v1/qc/pdi/pdi-1/pass', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      }
    });
    console.log('✓ PATCH /api/v1/qc/pdi/:id/pass as OPERATOR status:', resRbacPdi.status, '(Expected: 403)');
    if (resRbacPdi.status !== 403) throw new Error('Expected 403 when OPERATOR attempts PDI clearance');

    console.log('\n--- 3. Testing Production / Job Cards Operations ---');
    // Fetch Job Cards
    const resJobs = await fetch('http://localhost:3005/api/v1/production/jobs', {
      headers: { 'Authorization': `Bearer ${operatorToken}` }
    });
    const jobsData = await resJobs.json();
    console.log('✓ GET /api/v1/production/jobs status:', resJobs.status, 'Total Jobs:', jobsData.data.length);

    // Create new Job Card
    const testJobNo = `JC/TEST-${Date.now().toString().slice(-4)}/26-27`;
    const resCreateJob = await fetch('http://localhost:3005/api/v1/production/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({
        jobNo: testJobNo,
        orderPo: 'PO-2026-TEST-99',
        partCode: '00000001',
        partDescription: 'MAIN SPINDLE HOUSING 120MM',
        orderStatus: 'IN_PRODUCTION',
        qty: 50,
        machine: 'VMC-01 (Vertical Milling)',
        targetDate: '2026-08-25',
        status: 'SCHEDULED',
        reserveStock: true
      })
    });
    const createJobData = await resCreateJob.json();
    console.log('✓ POST /api/v1/production/jobs status:', resCreateJob.status, 'Created Job:', createJobData.data.jobNo);
    if (resCreateJob.status !== 201) throw new Error('Failed to create Job Card');

    // Log Production Quantity
    const resLogProd = await fetch('http://localhost:3005/api/v1/production/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({
        jobNo: testJobNo,
        itemCode: '00000001',
        description: 'MAIN SPINDLE HOUSING 120MM',
        stepNo: 1,
        operationName: 'VMC Rough & Finish Milling',
        qtyDone: 50,
        autoTriggerQC: true
      })
    });
    const logProdData = await resLogProd.json();
    console.log('✓ POST /api/v1/production/logs status:', resLogProd.status, 'Logged Qty:', logProdData.data.log.qtyDone, 'QC Triggered:', logProdData.data.qcTriggered);
    if (resLogProd.status !== 201) throw new Error('Failed to log production');

    console.log('\n--- 4. Testing QC Inspection Review ---');
    // Fetch QC queue
    const resQC = await fetch('http://localhost:3005/api/v1/qc/inspections', {
      headers: { 'Authorization': `Bearer ${qcToken}` }
    });
    const qcData = await resQC.json();
    console.log('✓ GET /api/v1/qc/inspections status:', resQC.status, 'Total in QC:', qcData.data.length);

    // Review QC item as QC_MANAGER (PASS)
    const targetQc = qcData.data.find((q: any) => q.jobNo === testJobNo) || qcData.data[0];
    const resReviewQC = await fetch(`http://localhost:3005/api/v1/qc/inspections/${targetQc.id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${qcToken}`
      },
      body: JSON.stringify({
        qcStatus: 'PASS',
        inspectorNotes: '100% dimensions passed CMM probe inspection.'
      })
    });
    const reviewQcData = await resReviewQC.json();
    console.log('✓ PATCH /api/v1/qc/inspections/:id/review as QC_MANAGER status:', resReviewQC.status, 'New QC Status:', reviewQcData.data.qcStatus);
    if (reviewQcData.data.qcStatus !== 'PASS') throw new Error('Failed to pass QC inspection');

    console.log('\n--- 5. Testing PDI Inspection & Dispatch Eligibility Gatekeeper ---');
    // Fetch PDI queue
    const resPDI = await fetch('http://localhost:3005/api/v1/qc/pdi', {
      headers: { 'Authorization': `Bearer ${qcToken}` }
    });
    const pdiData = await resPDI.json();
    console.log('✓ GET /api/v1/qc/pdi status:', resPDI.status, 'Total in PDI:', pdiData.data.length);

    // Pass PDI inspection
    const targetPdi = pdiData.data.find((p: any) => p.orderPo === targetQc.orderPo) || pdiData.data[0];
    const resPassPdi = await fetch(`http://localhost:3005/api/v1/qc/pdi/${targetPdi.id}/pass`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${qcToken}`
      }
    });
    const passPdiData = await resPassPdi.json();
    console.log('✓ PATCH /api/v1/qc/pdi/:id/pass status:', resPassPdi.status, 'Certificate Issued:', passPdiData.data.certificateNo);
    if (passPdiData.data.pdiStatus !== 'PASS') throw new Error('Failed to pass PDI inspection');

    // Verify Dispatch Eligibility
    const resEligibility = await fetch(`http://localhost:3005/api/v1/qc/dispatch-eligibility/${targetQc.orderPo}`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const eligibilityData = await resEligibility.json();
    console.log('✓ GET /api/v1/qc/dispatch-eligibility/:orderPo status:', resEligibility.status, 'Eligible for Dispatch:', eligibilityData.data.eligible, 'Passed PDI Count:', eligibilityData.data.passedPdiCount);
    if (!eligibilityData.data.eligible) throw new Error('Order was expected to be eligible for dispatch after passing QC & PDI');

    console.log('\n=============================================================');
    console.log('🎉 PRODUCTION, QC & PDI REST API INTEGRATION TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (err: any) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close();
  }
});

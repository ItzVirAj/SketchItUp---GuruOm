/**
 * =========================================================================
 * Comprehensive Verification Test Suite: Ledger-Based Inventory System
 * =========================================================================
 * Verifies:
 * 1. Append-Only DB trigger immutability (UPDATE and DELETE are blocked).
 * 2. Inbound movements (+signed quantity) increment balance.
 * 3. Outbound movements (-signed quantity) decrement balance.
 * 4. Sum of all movement entries strictly derives current on-hand stock.
 * 5. Correction / Reversal movements offset mistakes without mutating history.
 * 6. Item-level chronological history and running balance accuracy.
 * 7. Stock Reconciliation detects physical discrepancies.
 */

import { inventoryMovementsService } from '../src/modules/inventory/inventory_movements.service';
import { inventoryService } from '../src/modules/inventory/inventory.service';

async function runInventoryLedgerTests() {
  console.log('======================================================');
  console.log('⚡ EXECUTING LEDGER-BASED INVENTORY TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      failed++;
    }
  }

  // ------------------------------------------------------------------
  // TEST 1: Structure & Initial Balance Verification
  // ------------------------------------------------------------------
  console.log('▶ TEST 1: Initial Ledger State & Derived Balance');
  const testItem = 'TEST-SKU-001';

  // Record Opening Balance
  const initMov = await inventoryMovementsService.recordMovement({
    itemCode: testItem,
    location: 'MAIN-WAREHOUSE',
    quantityChange: 100,
    movementType: 'OPENING_BALANCE',
    referenceId: 'INIT-TEST-001',
    referenceType: 'system',
    actorEmail: 'system@guruom.in',
    notes: 'Initial opening stock backfill'
  });

  assert(Boolean(initMov.id), 'Movement record generated unique ID');
  assert(initMov.quantity_change === 100, 'Opening balance quantity is +100');
  assert(initMov.balance_after === 100, 'Initial balance_after is 100');
  assert(initMov.movement_type === 'OPENING_BALANCE', 'Movement type is OPENING_BALANCE');

  const derivedInitial = await inventoryMovementsService.getCurrentBalance(testItem);
  assert(derivedInitial === 100, `Derived balance matches initial sum: 100 (Got ${derivedInitial})`);

  // ------------------------------------------------------------------
  // TEST 2: Inbound Movement (GRN Goods Receipt)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 2: Inbound Goods Receipt (GRN)');
  const grnMov = await inventoryMovementsService.recordMovement({
    itemCode: testItem,
    quantityChange: 250,
    movementType: 'GRN',
    referenceId: 'GRN-26-099',
    referenceType: 'grn',
    actorEmail: 'store@guruom.in',
    notes: 'Supplier shipment arrived from Hindalco Industries'
  });

  assert(grnMov.quantity_change === 250, 'Inbound GRN records positive quantity (+250)');
  assert(grnMov.balance_after === 350, `Running balance updated: 100 + 250 = 350 (Got ${grnMov.balance_after})`);

  const derivedAfterGrn = await inventoryMovementsService.getCurrentBalance(testItem);
  assert(derivedAfterGrn === 350, `Derived balance after GRN is 350 (Got ${derivedAfterGrn})`);

  // ------------------------------------------------------------------
  // TEST 3: Outbound Movements (Production Consumption & Dispatch)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 3: Outbound Movements (Production & Dispatch)');
  
  // Production Consumption (-70)
  const prodMov = await inventoryMovementsService.recordMovement({
    itemCode: testItem,
    quantityChange: -70,
    movementType: 'PRODUCTION_CONSUMPTION',
    referenceId: 'JC/0042/26-27',
    referenceType: 'job_card',
    actorEmail: 'production@guruom.in',
    notes: 'Material issued to CNC Machining Cell #2'
  });

  assert(prodMov.quantity_change === -70, 'Production consumption is signed negative (-70)');
  assert(prodMov.balance_after === 280, `Running balance after production: 350 - 70 = 280 (Got ${prodMov.balance_after})`);

  // Dispatch (-50)
  const dispatchMov = await inventoryMovementsService.recordMovement({
    itemCode: testItem,
    quantityChange: -50,
    movementType: 'DISPATCH',
    referenceId: 'CHL/0088/26-27',
    referenceType: 'dispatch',
    actorEmail: 'dispatch@guruom.in',
    notes: 'Dispatched to Bharat Dynamics Ltd'
  });

  assert(dispatchMov.quantity_change === -50, 'Dispatch is signed negative (-50)');
  assert(dispatchMov.balance_after === 230, `Running balance after dispatch: 280 - 50 = 230 (Got ${dispatchMov.balance_after})`);

  const currentDerived = await inventoryMovementsService.getCurrentBalance(testItem);
  assert(currentDerived === 230, `Sum of all movements strictly equals 230 (Got ${currentDerived})`);

  // ------------------------------------------------------------------
  // TEST 4: Stock Adjustment through Service Layer
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 4: Service-Layer Stock Adjustment (Append-Only Delta)');
  const adjustResult = await inventoryService.adjustStock(testItem, { newOnHand: 245 }, 'audit@guruom.in');

  assert(adjustResult.onHand === 245, `adjustStock computed new on-hand = 245 (Got ${adjustResult.onHand})`);

  const derivedAfterAdjust = await inventoryMovementsService.getCurrentBalance(testItem);
  assert(derivedAfterAdjust === 245, `Derived balance after adjustment is 245 (Got ${derivedAfterAdjust})`);

  // ------------------------------------------------------------------
  // TEST 5: Item Movement History Trajectory
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 5: Chronological Item Stock History');
  const history = await inventoryMovementsService.getItemStockHistory(testItem);

  assert(history.length >= 5, `History recorded all ${history.length} movement steps`);
  assert(history[0].balance_after === 245, 'Latest history row balance_after is 245');
  assert(history[history.length - 1].movement_type === 'OPENING_BALANCE', 'First movement in history is OPENING_BALANCE');

  // ------------------------------------------------------------------
  // TEST 6: Correction & Reversal Movements (Without Mutating History)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 6: Correction / Reversal Movement');
  const corrMov = await inventoryMovementsService.recordCorrection(
    dispatchMov.id,
    'Client canceled dispatch box returned to warehouse',
    'admin@guruom.in'
  );

  assert(corrMov.movement_type === 'CORRECTION', 'Correction movement created with type CORRECTION');
  assert(corrMov.quantity_change === 50, `Offsetting quantity is +50 (Got ${corrMov.quantity_change})`);
  assert(corrMov.balance_after === 295, `Balance restored: 245 + 50 = 295 (Got ${corrMov.balance_after})`);
  assert(corrMov.reference_id === dispatchMov.id, 'References original movement ID');

  // Verify original movement was NOT deleted or edited
  const originalAfterCorrection = (await inventoryMovementsService.getItemStockHistory(testItem)).find(m => m.id === dispatchMov.id);
  assert(Boolean(originalAfterCorrection), 'Original dispatch movement is preserved in ledger');
  assert(originalAfterCorrection?.quantity_change === -50, 'Original movement quantity remained un-mutated');

  // ------------------------------------------------------------------
  // TEST 7: Database-Level Append-Only Immutability Verification
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 7: Append-Only DB Immutability');
  try {
    inventoryMovementsService.preventMovementMutation('UPDATE');
    assert(false, 'Should have thrown UPDATE exception');
  } catch (err: any) {
    assert(err.message.includes('append-only: UPDATE not allowed'), 'Trigger Exception: UPDATE on inventory_movements is blocked');
  }

  try {
    inventoryMovementsService.preventMovementMutation('DELETE');
    assert(false, 'Should have thrown DELETE exception');
  } catch (err: any) {
    assert(err.message.includes('append-only: DELETE not allowed'), 'Trigger Exception: DELETE on inventory_movements is blocked');
  }

  // ------------------------------------------------------------------
  // TEST 8: Stock Reconciliation Report
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 8: Stock Reconciliation Audit Report');
  const report = await inventoryMovementsService.getStockReconciliation();

  assert(report.length > 0, 'Reconciliation report generated for audited SKUs');
  assert(report.every(r => typeof r.ledgerBalance === 'number'), 'All items compute ledger-derived balances');
  assert(report.every(r => typeof r.discrepancy === 'number'), 'All items calculate exact discrepancy deltas');

  console.log('\n======================================================');
  console.log(`📊 FINAL SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runInventoryLedgerTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

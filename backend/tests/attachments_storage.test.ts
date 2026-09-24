import { attachmentsService, FileScanningInProgressError, FileInfectedError, DuplicateAttachmentError } from '../src/modules/attachments/attachments.service';
import { validateMagicBytes, MAX_FILE_SIZE_BYTES } from '../src/middleware/upload.middleware';
import { StorageService, ATTACHMENTS_BUCKET } from '../src/lib/storage';

async function runAttachmentTests() {
  console.log('======================================================');
  console.log('📦 EXECUTING FILE STORAGE & ATTACHMENTS TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ' -> ' + detail : ''}`);
      failed++;
    }
  }

  const tenantAlpha = 't_tenant_alpha';
  const tenantBeta = 't_tenant_beta';

  // Valid PDF header mock buffer: %PDF-1.4 ...
  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  // Valid PNG header mock buffer: \x89PNG\r\n\x1a\n ...
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
  // Spoofed EXE buffer disguised with .pdf filename: MZ header
  const spoofedExeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff]);
  // EICAR Antivirus Test Signature Buffer
  const eicarBuffer = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');

  // ----------------------------------------------------
  // TEST 1: MIME Type Verification via Magic Bytes (MIME Spoofing Protection)
  // ----------------------------------------------------
  console.log('▶ TEST 1: Server-Side Magic Bytes Verification');
  const verifiedPdf = await validateMagicBytes(validPdfBuffer, 'inspection.pdf');
  assert(verifiedPdf.mime === 'application/pdf', 'Verifies legitimate PDF magic bytes signature');

  let caughtSpoof = false;
  try {
    // Client claims file is "report.pdf" but contents are Windows MZ executable
    await validateMagicBytes(spoofedExeBuffer, 'report.pdf');
  } catch (err: any) {
    caughtSpoof = true;
  }
  assert(caughtSpoof, 'Catches spoofed executable disguised as PDF via binary magic bytes inspection');

  // ----------------------------------------------------
  // TEST 2: Successful Upload & Initial Pending Status
  // ----------------------------------------------------
  console.log('\n▶ TEST 2: Attachment Upload & Metadata Creation');
  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'PDI-Report-Lot88.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: validPdfBuffer.length,
    buffer: validPdfBuffer,
    destination: '',
    filename: '',
    path: '',
    stream: null as any
  };

  const uploadResult = await attachmentsService.uploadAttachment({
    file: mockFile,
    entity_type: 'pdi_report',
    entity_id: 'pdi_job_101',
    tenantId: tenantAlpha,
    userId: 'usr_inspector_1'
  });

  assert(!!uploadResult.id, 'Generates secure UUID primary key');
  assert(uploadResult.tenant_id === tenantAlpha, 'Scopes record to authenticated tenant');
  assert(uploadResult.entity_type === 'pdi_report', 'Associates with pdi_report entity');
  assert(uploadResult.version === 1, 'Initial version defaults to 1');
  assert(uploadResult.is_current === true, 'Initial version flagged is_current = true');
  assert(uploadResult.scan_status === 'pending' || uploadResult.scan_status === 'clean', 'Sets scan_status to pending or completed scan');

  // ----------------------------------------------------
  // TEST 3: Duplicate Checksum Detection
  // ----------------------------------------------------
  console.log('\n▶ TEST 3: Checksum (SHA-256) Duplicate Rejection');
  let duplicateCaught = false;
  try {
    await attachmentsService.uploadAttachment({
      file: mockFile,
      entity_type: 'pdi_report',
      entity_id: 'pdi_job_101',
      tenantId: tenantAlpha,
      userId: 'usr_inspector_1'
    });
  } catch (err: any) {
    if (err instanceof DuplicateAttachmentError || err.statusCode === 409) {
      duplicateCaught = true;
    }
  }
  assert(duplicateCaught, 'Rejects duplicate upload with matching SHA-256 checksum for same entity');

  // ----------------------------------------------------
  // TEST 4: File Versioning on Revision Uploads
  // ----------------------------------------------------
  console.log('\n▶ TEST 4: Automated File Versioning');
  const revisionBuffer = Buffer.from('%PDF-1.4\nRevision 2 Updates with Calibration Data\n%%EOF');
  const revisionFile: Express.Multer.File = {
    ...mockFile,
    originalname: 'PDI-Report-Lot88-Rev2.pdf',
    size: revisionBuffer.length,
    buffer: revisionBuffer
  };

  const revisionResult = await attachmentsService.uploadAttachment({
    file: revisionFile,
    entity_type: 'pdi_report',
    entity_id: 'pdi_job_101',
    tenantId: tenantAlpha,
    userId: 'usr_inspector_1'
  });

  assert(revisionResult.version === 2, 'Increments version to 2 for updated entity report');
  assert(revisionResult.is_current === true, 'New revision becomes is_current = true');

  const priorRecord = await attachmentsService.getAttachmentById(uploadResult.id, tenantAlpha);
  assert(priorRecord?.is_current === false, 'Previous version demoted to is_current = false');

  // Query only current version
  const currentOnlyList = await attachmentsService.getAttachments({
    tenantId: tenantAlpha,
    entity_type: 'pdi_report',
    entity_id: 'pdi_job_101',
    currentOnly: true
  });
  assert(currentOnlyList.length === 1 && currentOnlyList[0].version === 2, 'current=true filter returns only newest active version');

  // ----------------------------------------------------
  // TEST 5: Download Blocking on Pending & Infected Scans
  // ----------------------------------------------------
  console.log('\n▶ TEST 5: Download Security Policy (Pending & Infected Blocks)');
  // Set to pending
  await attachmentsService.updateScanStatus(uploadResult.id, 'pending', {});
  let blockedOnPending = false;
  try {
    await attachmentsService.getSignedDownloadUrl(uploadResult.id, tenantAlpha);
  } catch (err: any) {
    if (err instanceof FileScanningInProgressError || err.statusCode === 423) {
      blockedOnPending = true;
    }
  }
  assert(blockedOnPending, 'Blocks download while scan_status = pending (423 Locked)');

  // Set to infected
  await attachmentsService.updateScanStatus(uploadResult.id, 'infected', { threat: 'EICAR' });
  let blockedOnInfected = false;
  try {
    await attachmentsService.getSignedDownloadUrl(uploadResult.id, tenantAlpha);
  } catch (err: any) {
    if (err instanceof FileInfectedError || err.statusCode === 403) {
      blockedOnInfected = true;
    }
  }
  assert(blockedOnInfected, 'Blocks download and quarantines file when scan_status = infected (403 Forbidden)');

  // ----------------------------------------------------
  // TEST 6: Signed URL Generation for Clean Attachments
  // ----------------------------------------------------
  console.log('\n▶ TEST 6: Short-Lived Signed URL Generation');
  await attachmentsService.updateScanStatus(revisionResult.id, 'clean', { engine: 'ClamAV' });
  const signedRes = await attachmentsService.getSignedDownloadUrl(revisionResult.id, tenantAlpha, 120);

  assert(!!signedRes.signedUrl, 'Generates secure signed download URL');
  assert(signedRes.expiresIn === 120, 'Configures 120-second short-lived URL expiry');

  // ----------------------------------------------------
  // TEST 7: Cross-Tenant Isolation
  // ----------------------------------------------------
  console.log('\n▶ TEST 7: Strict Cross-Tenant Access Rejection');
  let crossTenantRejected = false;
  try {
    // Tenant Beta tries to access Tenant Alpha's attachment
    await attachmentsService.getSignedDownloadUrl(revisionResult.id, tenantBeta);
  } catch {
    crossTenantRejected = true;
  }
  assert(crossTenantRejected, 'Rejects cross-tenant download request with NotFound/Forbidden');

  const tenantBetaList = await attachmentsService.getAttachments({ tenantId: tenantBeta });
  assert(!tenantBetaList.some(a => a.id === revisionResult.id), 'Tenant Beta query returns zero Tenant Alpha documents');

  // ----------------------------------------------------
  // TEST 8: Soft Deletion & Audit Trail Preservation
  // ----------------------------------------------------
  console.log('\n▶ TEST 8: Soft Deletion Compliance');
  await attachmentsService.softDeleteAttachment(uploadResult.id, tenantAlpha);

  const activeListAfterDelete = await attachmentsService.getAttachments({
    tenantId: tenantAlpha,
    entity_type: 'pdi_report',
    entity_id: 'pdi_job_101'
  });
  assert(!activeListAfterDelete.some(a => a.id === uploadResult.id), 'Soft-deleted version hidden from standard list queries');

  console.log('\n======================================================');
  console.log(`📊 ATTACHMENT SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runAttachmentTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

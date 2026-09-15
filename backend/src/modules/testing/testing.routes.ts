import { Router, Request, Response } from 'express';
import { testingWorkflowService } from './testing.service';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

// Developer-only surface. Mapped to 'approvals' + FULL_APPROVE — the only tier
// whose holder set {ServerAdmin, Owner, Admin (System), TESTER} reproduces the
// legacy admin-only list without widening it ('settings' would additionally
// admit HR/Admin). The legacy list also failed open on 'ADMIN_OWNER'/'ADMIN'
// etc. (normalizeRole -> Shop Floor Supervisor); that accidental SFS access
// ends here — deliberate tightening. Mount itself is NODE_ENV-gated in server.ts.

/**
 * GET /api/v1/testing/last-run
 * Retrieve status of the latest test execution.
 */
router.get('/last-run', requirePermission('approvals', 'FULL_APPROVE'), (req: Request, res: Response) => {
  const lastRun = testingWorkflowService.getLastRun();
  return res.json({ success: true, data: lastRun });
});

/**
 * POST /api/v1/testing/run-golden-path
 * Trigger full 14-stage Order-to-Cash workflow testing sequence.
 */
router.post('/run-golden-path', requirePermission('approvals', 'FULL_APPROVE'), async (req: Request, res: Response) => {
  try {
    const testUnhappyPath = req.body?.testUnhappyPath !== false;
    const runResult = await testingWorkflowService.runFullWorkflow(testUnhappyPath);
    return res.json({
      success: runResult.status === 'COMPLETED',
      data: runResult
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Workflow execution failed'
    });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { testingWorkflowService } from './testing.service';

const router = Router();

/**
 * GET /api/v1/testing/last-run
 * Retrieve status of the latest test execution.
 */
router.get('/last-run', (req: Request, res: Response) => {
  const lastRun = testingWorkflowService.getLastRun();
  return res.json({ success: true, data: lastRun });
});

/**
 * POST /api/v1/testing/run-golden-path
 * Trigger full 14-stage Order-to-Cash workflow testing sequence.
 */
router.post('/run-golden-path', async (req: Request, res: Response) => {
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

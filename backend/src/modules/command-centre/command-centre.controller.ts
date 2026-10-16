import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import {
  CommandCentreQueryValidationError,
  parseCommandCentreQuery,
} from './command-centre.schema';
import { commandCentreService } from './command-centre.service';

function validationResponse(error: CommandCentreQueryValidationError, res: Response) {
  return res.status(400).json({
    error: 'ValidationError',
    message: error.message,
    issues: error.issues,
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected command-centre error.';
}

export class CommandCentreController {
  async getSummary(req: Request, res: Response) {
    try {
      const range = parseCommandCentreQuery(req.query);
      return res.json({ data: await commandCentreService.getSummary(range) });
    } catch (error: unknown) {
      if (error instanceof CommandCentreQueryValidationError) return validationResponse(error, res);
      logger.error('[CommandCentreController] getSummary error:', errorMessage(error));
      return res.status(500).json({ error: 'InternalServerError', message: 'Unable to load command-centre summary.' });
    }
  }

  async getTrend(req: Request, res: Response) {
    try {
      const range = parseCommandCentreQuery(req.query);
      return res.json({ data: await commandCentreService.getTrend(range) });
    } catch (error: unknown) {
      if (error instanceof CommandCentreQueryValidationError) return validationResponse(error, res);
      logger.error('[CommandCentreController] getTrend error:', errorMessage(error));
      return res.status(500).json({ error: 'InternalServerError', message: 'Unable to load command-centre trend.' });
    }
  }

  async getOperations(req: Request, res: Response) {
    try {
      const range = parseCommandCentreQuery(req.query);
      return res.json({ data: await commandCentreService.getOperations(range) });
    } catch (error: unknown) {
      if (error instanceof CommandCentreQueryValidationError) return validationResponse(error, res);
      logger.error('[CommandCentreController] getOperations error:', errorMessage(error));
      return res.status(500).json({ error: 'InternalServerError', message: 'Unable to load command-centre operations.' });
    }
  }

  async getFeeds(req: Request, res: Response) {
    try {
      const range = parseCommandCentreQuery(req.query);
      return res.json({ data: await commandCentreService.getFeeds(range) });
    } catch (error: unknown) {
      if (error instanceof CommandCentreQueryValidationError) return validationResponse(error, res);
      logger.error('[CommandCentreController] getFeeds error:', errorMessage(error));
      return res.status(500).json({ error: 'InternalServerError', message: 'Unable to load command-centre feeds.' });
    }
  }
}

export const commandCentreController = new CommandCentreController();

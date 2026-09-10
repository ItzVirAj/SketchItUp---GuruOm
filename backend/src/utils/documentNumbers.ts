/**
 * Shared atomic document-number generator (C-02).
 *
 * Statutory/compliance document numbers (invoices, challans, NCRs, PDI
 * certificates, gate passes, purchase requisitions, …) MUST come from the
 * DB-side atomic sequence so they can never collide or go out of order.
 * This replaces the previous `Math.random()`-suffixed client/server fallbacks.
 *
 * Attempts the `get_next_document_number` RPC (row-locked upsert on
 * `document_sequences`), and falls back to a process-local in-memory counter
 * only when the DB is unavailable (seed/offline mode). The DB is always the
 * authority in production.
 */
import { getDbClient } from '../config/database';
import { getCurrentFinancialYear, formatDocumentNumber } from '../../../src/utils/statutoryAccountingEngine';
import { logger } from './logger';

const documentSequenceState: Record<string, number> = {};

export async function getNextDocumentNumber(seriesCode: string, prefix: string): Promise<string> {
  const db = getDbClient();
  const fy = getCurrentFinancialYear();
  const seqKey = `${seriesCode}-${fy}`;

  try {
    const { data, error } = await db.rpc('get_next_document_number', {
      p_series_code: seriesCode,
      p_prefix: prefix,
      p_fy: fy
    });

    if (!error && data) {
      return data as string;
    }
    logger.warn(`DB getNextDocumentNumber RPC returned no data for ${seqKey}, falling back to in-memory counter:`, error);
  } catch (err) {
    logger.warn(`DB getNextDocumentNumber RPC failed for ${seqKey}, falling back to in-memory counter:`, err);
  }

  // In-memory fallback (seed/offline mode only). Never uses Math.random().
  const current = (documentSequenceState[seqKey] || 0) + 1;
  documentSequenceState[seqKey] = current;
  return formatDocumentNumber(prefix, fy, current);
}
import { apiClient } from '../../../lib/apiClient';
import {
  CommandCentreFeeds,
  CommandCentreOperations,
  CommandCentreRangeInput,
  CommandCentreSummary,
  CommandCentreTrend
} from '../types';

function toQuery(range: CommandCentreRangeInput): string {
  const params = new URLSearchParams({
    from: range.from,
    to: range.to,
    granularity: range.granularity
  });
  return `?${params.toString()}`;
}

export async function fetchCommandCentreSummary(
  range: CommandCentreRangeInput,
  signal?: AbortSignal
): Promise<CommandCentreSummary> {
  return request<CommandCentreSummary>('/command-centre/summary', range, signal);
}

export async function fetchCommandCentreTrend(
  range: CommandCentreRangeInput,
  signal?: AbortSignal
): Promise<CommandCentreTrend> {
  return request<CommandCentreTrend>('/command-centre/trend', range, signal);
}

export async function fetchCommandCentreOperations(
  range: CommandCentreRangeInput,
  signal?: AbortSignal
): Promise<CommandCentreOperations> {
  return request<CommandCentreOperations>('/command-centre/operations', range, signal);
}

export async function fetchCommandCentreFeeds(
  range: CommandCentreRangeInput,
  signal?: AbortSignal
): Promise<CommandCentreFeeds> {
  return request<CommandCentreFeeds>('/command-centre/feeds', range, signal);
}

async function request<T>(path: string, range: CommandCentreRangeInput, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
  const response = await apiClient.get<{ data: T }>(`${path}${toQuery(range)}`, undefined, signal);
  if (!response?.data) throw new Error('The Command Centre returned an empty response.');
  return response.data;
}

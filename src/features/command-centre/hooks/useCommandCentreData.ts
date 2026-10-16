import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchCommandCentreFeeds,
  fetchCommandCentreOperations,
  fetchCommandCentreSummary,
  fetchCommandCentreTrend
} from '../api/commandCentreApi';
import {
  CommandCentreApiState,
  CommandCentreFeeds,
  CommandCentreOperations,
  CommandCentreRangeInput,
  CommandCentreSummary,
  CommandCentreTrend
} from '../types';

interface CommandCentreData {
  summary: CommandCentreSummary | null;
  trend: CommandCentreTrend | null;
  operations: CommandCentreOperations | null;
  feeds: CommandCentreFeeds | null;
}

interface CommandCentreDataResult {
  data: CommandCentreData;
  states: Record<'summary' | 'trend' | 'operations' | 'feeds', CommandCentreApiState>;
  refresh: () => Promise<void>;
  retry: (section: keyof CommandCentreData) => Promise<void>;
  isRefreshing: boolean;
}

type Section = keyof CommandCentreData;

const emptyData: CommandCentreData = { summary: null, trend: null, operations: null, feeds: null };
const sectionKeys: Section[] = ['summary', 'trend', 'operations', 'feeds'];

export function useCommandCentreData(range: CommandCentreRangeInput): CommandCentreDataResult {
  const [data, setData] = useState<CommandCentreData>(emptyData);
  const [states, setStates] = useState<CommandCentreDataResult['states']>(() => makeInitialStates());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cache = useRef(new Map<string, CommandCentreData>());
  const requestId = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  const rangeKey = `${range.from}:${range.to}:${range.granularity}`;

  const load = useCallback(async (force = false) => {
    const currentRequest = ++requestId.current;
    const cached = !force ? cache.current.get(rangeKey) : undefined;
    if (cached) {
      setData(cached);
      setStates(makeSuccessStates());
      return;
    }

    setIsRefreshing(true);
    setStates(prev => Object.fromEntries(sectionKeys.map(key => [
      key,
      { status: prev[key].status === 'success' ? 'refreshing' : 'loading', error: null }
    ])) as CommandCentreDataResult['states']);

    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    const requests: Record<Section, Promise<unknown>> = {
      summary: fetchCommandCentreSummary(range, controller.signal),
      trend: fetchCommandCentreTrend(range, controller.signal),
      operations: fetchCommandCentreOperations(range, controller.signal),
      feeds: fetchCommandCentreFeeds(range, controller.signal)
    };
    const settled = await Promise.allSettled(sectionKeys.map(key => requests[key]));
    if (currentRequest !== requestId.current) return;

    const nextData: CommandCentreData = { ...emptyData };
    const nextStates = makeInitialStates();
    settled.forEach((result, index) => {
      const key = sectionKeys[index];
      if (result.status === 'fulfilled') {
        nextData[key] = result.value as never;
        nextStates[key] = { status: 'success', error: null };
      } else if (result.reason?.name !== 'AbortError') {
        nextStates[key] = { status: 'error', error: messageFromError(result.reason) };
      }
    });
    setData(nextData);
    setStates(nextStates);
    cache.current.set(rangeKey, nextData);
    setIsRefreshing(false);
  }, [range, rangeKey]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
      abortController.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 75_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  const retry = useCallback(async (section: Section) => {
    setStates(prev => ({ ...prev, [section]: { status: 'loading', error: null } }));
    await load(true);
  }, [load]);

  return { data, states, refresh, retry, isRefreshing };
}

function makeInitialStates(): CommandCentreDataResult['states'] {
  return {
    summary: { status: 'idle', error: null },
    trend: { status: 'idle', error: null },
    operations: { status: 'idle', error: null },
    feeds: { status: 'idle', error: null }
  };
}

function makeSuccessStates(): CommandCentreDataResult['states'] {
  return Object.fromEntries(sectionKeys.map(key => [key, { status: 'success', error: null }])) as CommandCentreDataResult['states'];
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load this widget right now.';
}

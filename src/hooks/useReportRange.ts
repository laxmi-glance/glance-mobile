import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import reportsService from "../services/reports.service";
import type { ReportPage } from "../services/reports.service";
import { apiErrorMessage } from "../utils/errors";
import { mergeUniqueById } from "../utils/lists";
import { buildReportPresets } from "../utils/reportPeriod";
import type { FiscalYearBounds, ReportDateMode, ReportRange } from "../types/reports";

export function useReportRange(mode: ReportDateMode = "range") {
  const [fiscalYear, setFiscalYear] = useState<FiscalYearBounds | null>(null);
  const [ready, setReady] = useState(false);
  const [chosen, setChosen] = useState<ReportRange | null>(null);

  useEffect(() => {
    let cancelled = false;
    reportsService
      .getActiveFiscalYear()
      .then((value) => {
        if (!cancelled) {
          setFiscalYear(value);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const presets = useMemo(
    () => buildReportPresets(mode, new Date(), fiscalYear),
    [fiscalYear, mode]
  );
  const range = chosen ?? presets.find((preset) => preset.id === "current-fy") ?? presets[0];

  const setRange = useCallback((next: ReportRange) => {
    const [startDate, endDate] =
      next.startDate <= next.endDate
        ? [next.startDate, next.endDate]
        : [next.endDate, next.startDate];
    setChosen({ ...next, startDate, endDate });
  }, []);

  return { range, presets, setRange, ready, fiscalYear, mode };
}

export function usePagedReport<T extends { id: string }>(
  ready: boolean,
  resetKey: string,
  fetchPage: (page: number) => Promise<ReportPage<T>>
) {
  const fetchPageRef = useRef(fetchPage);
  useEffect(() => {
    fetchPageRef.current = fetchPage;
  }, [fetchPage]);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const genRef = useRef(0);

  const run = useCallback(async (mode: "load" | "refresh") => {
    const gen = ++genRef.current;
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const page = await fetchPageRef.current(1);
      if (gen !== genRef.current) {
        return;
      }
      setItems(page.results);
      setHasMore(Boolean(page.next));
      pageRef.current = 1;
      setError(null);
    } catch (err) {
      if (gen !== genRef.current) {
        return;
      }
      setError(apiErrorMessage(err, "Unable to load this report."));
    } finally {
      if (gen === genRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void run("load"); // eslint-disable-line react-hooks/set-state-in-effect -- load report page after async API call
  }, [ready, resetKey, run]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing || loadingMore) {
      return;
    }
    const gen = genRef.current;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const page = await fetchPageRef.current(nextPage);
      if (gen !== genRef.current) {
        return;
      }
      setItems((prev) => mergeUniqueById(prev, page.results, false));
      setHasMore(Boolean(page.next));
      pageRef.current = nextPage;
    } catch (err) {
      if (gen !== genRef.current) {
        return;
      }
      setError(apiErrorMessage(err, "Unable to load more."));
    } finally {
      if (gen === genRef.current) {
        setLoadingMore(false);
      }
    }
  }, [hasMore, loading, loadingMore, refreshing]);

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    refresh: () => run("refresh"),
    loadMore,
  };
}

import { useState, useCallback } from "react";
import type { ApiResponse, AnalyzeResponse, LogLevel } from "./types";

interface AnalyzeParams {
  logName: string;
  maxEvents: number;
  level?: LogLevel;
}

interface UseAnalyzeReturn {
  data: AnalyzeResponse | null;
  loading: boolean;
  error: string | null;
  analyze: (params: AnalyzeParams) => Promise<void>;
}

export function useAnalyze(): UseAnalyzeReturn {
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (params: AnalyzeParams) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const json: ApiResponse<AnalyzeResponse> = await res.json();

      if (!json.ok || !json.data) {
        throw new Error(json.error ?? "分析に失敗しました");
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, analyze };
}

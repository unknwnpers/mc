"use client";

import { useState, useCallback, useRef } from "react";

interface PincodeData {
  pincode: string;
  district: string;
  state: string;
  offices: Array<{
    name: string;
    district: string;
    state: string;
    delivery: string;
  }>;
}

interface UsePincodeReturn {
  data: PincodeData | null;
  loading: boolean;
  error: string | null;
  fetchPincode: (pincode: string) => Promise<PincodeData | null>;
  clear: () => void;
}

/**
 * Validate Indian PIN code format
 */
function isValidPincode(pincode: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pincode);
}

/**
 * Hook for fetching pincode data with debouncing
 */
export function usePincode(debounceMs: number = 500): UsePincodeReturn {
  const [data, setData] = useState<PincodeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const fetchPincode = useCallback(
    async (pincode: string): Promise<PincodeData | null> => {
      // Clear previous state
      setError(null);
      setData(null);

      // Validate
      if (!pincode || pincode.length !== 6) {
        return null;
      }

      if (!isValidPincode(pincode)) {
        setError("Invalid pincode format");
        return null;
      }

      // Cancel previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      // Debounce
      return new Promise((resolve) => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
          setLoading(true);

          try {
            const res = await fetch(`/api/pincode?pincode=${pincode}`, {
              signal: abortRef.current?.signal,
            });

            const result = await res.json();

            if (!res.ok) {
              setError(result.error || "Failed to fetch pincode data");
              setLoading(false);
              resolve(null);
              return;
            }

            if (result.success && result.data) {
              setData(result.data);
              setLoading(false);
              resolve(result.data);
              return;
            }

            setError("No data found");
            setLoading(false);
            resolve(null);
          } catch (err: any) {
            if (err.name === "AbortError") {
              // Request was cancelled, don't update state
              resolve(null);
              return;
            }
            setError(err.message || "Network error");
            setLoading(false);
            resolve(null);
          }
        }, debounceMs);
      });
    },
    [debounceMs]
  );

  return {
    data,
    loading,
    error,
    fetchPincode,
    clear,
  };
}

export default usePincode;

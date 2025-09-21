import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface AsyncComboProps {
  value: string;
  onChange: (v: string) => void;
  fetchUrl: string; // e.g. /api/suggest/roles?q=
  placeholder?: string;
  minChars?: number;
  limit?: number;
}

export default function AsyncCombo({ value, onChange, fetchUrl, placeholder = "Type to search...", minChars = 1, limit = 20 }: AsyncComboProps) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as any)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if ((query || "").length < minChars) {
      setOptions([]);
      return;
    }
    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(`${fetchUrl}${encodeURIComponent(query)}&limit=${limit}`, { credentials: "include" });
        const data = await resp.json();
        if (Array.isArray(data)) setOptions(data);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
        setOpen(true);
      }
    }, 200); // debounce
  }, [query, fetchUrl, limit, minChars]);

  useEffect(() => {
    // Keep input in sync if parent value changes externally
    setQuery(value || "");
  }, [value]);

  const showList = open && (loading || options.length > 0);

  return (
    <div className="relative" ref={boxRef}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if ((query || "").length >= minChars) setOpen(true);
        }}
        placeholder={placeholder}
      />
      {showList && (
        <Card className="absolute z-50 mt-1 w-full max-h-64 overflow-auto border-border">
          <ul className="divide-y divide-border">
            {loading ? (
              <li className="p-2 text-sm text-muted-foreground">Loading...</li>
            ) : options.length === 0 ? (
              <li className="p-2 text-sm text-muted-foreground">No results</li>
            ) : (
              options.map((opt, idx) => (
                <li
                  key={idx}
                  className="p-2 text-sm cursor-pointer hover:bg-secondary"
                  onClick={() => {
                    onChange(opt);
                    setQuery(opt);
                    setOpen(false);
                  }}
                >
                  {opt}
                </li>
              ))
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}

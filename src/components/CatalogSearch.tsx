import React, { useState, useRef, useEffect } from "react";
import { Search, Loader2, Pill } from "lucide-react";
import { DrugCatalog } from "../db";
import { searchCatalog } from "../services/catalogLoader";
import { formatEgp } from "../utils/format";

interface Props {
  onSelect: (drug: DrugCatalog) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const CatalogSearch: React.FC<Props> = ({
  onSelect,
  placeholder = "ابحث بالاسم عربي أو إنجليزي أو التركيب…",
  autoFocus = false,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DrugCatalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);

  // debounced search
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const hits = await searchCatalog(query, 15);
      setResults(hits);
      setOpen(hits.length > 0);
      setLoading(false);
    }, 280);
  }, [query]);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (drug: DrugCatalog) => {
    setQuery(drug.commercial_name_en);
    setOpen(false);
    onSelect(drug);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="field-input pl-10 text-right placeholder:text-right"
          dir="auto"
        />
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
          {results.map((drug, i) => (
            <button
              key={i}
              onMouseDown={() => handleSelect(drug)}
              className="w-full border-b border-slate-100 px-4 py-3 text-right transition-colors last:border-b-0 hover:bg-[#f4fbf6]"
            >
              <div className="flex items-start gap-3">
                <Pill className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 text-sm truncate">
                      {drug.commercial_name_en}
                    </span>
                    {drug.price_egp > 0 && (
                      <span className="text-emerald-600 text-xs font-bold shrink-0">
                        {formatEgp(drug.price_egp)}
                      </span>
                    )}
                  </div>
                  {drug.commercial_name_ar && (
                    <div className="text-gray-600 text-xs mt-0.5">
                      {drug.commercial_name_ar}
                    </div>
                  )}
                  {drug.scientific_composition && (
                    <div className="text-gray-400 text-xs mt-0.5 truncate">
                      {drug.scientific_composition}
                    </div>
                  )}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {drug.manufacturer && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {drug.manufacturer}
                      </span>
                    )}
                    {drug.route && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {drug.route}
                      </span>
                    )}
                    {drug.barcode && (
                      <span className="text-xs font-mono text-slate-500 px-2 py-0.5">
                        {drug.barcode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {open && results.length === 0 && query.trim().length >= 2 && !loading && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200
          rounded-lg shadow-xl p-4 text-center text-gray-500 text-sm"
        >
          مش لاقي نتايج لـ "{query}"
        </div>
      )}
    </div>
  );
};

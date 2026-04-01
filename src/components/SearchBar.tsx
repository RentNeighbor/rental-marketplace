"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface LocationSuggestion {
  place_id: number;
  display_name: string;
  name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    county?: string;
  };
}

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(
    searchParams.get("location") || ""
  );
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const locationWrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLocationChange(value: string) {
    setLocation(value);
    setShowSuggestions(false);
    setSuggestions([]);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&limit=6&featuretype=city`,
          { headers: { "User-Agent": "RentNeighbor/1.0" } }
        );
        const data: LocationSuggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        // silently ignore fetch errors
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
  }

  function selectSuggestion(suggestion: LocationSuggestion) {
    const addr = suggestion.address;
    const parts = [
      addr.city || addr.town || addr.village || suggestion.name,
      addr.state,
      addr.country,
    ].filter(Boolean);
    setLocation(parts.join(", ") || suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function formatSuggestionLabel(suggestion: LocationSuggestion) {
    const addr = suggestion.address;
    const primary = addr.city || addr.town || addr.village || suggestion.name;
    const secondary = [addr.state || addr.county, addr.country].filter(Boolean).join(", ");
    return { primary, secondary };
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("q", query);
    else params.delete("q");
    if (location) params.set("location", location);
    else params.delete("location");
    router.push(`/?${params.toString()}`);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "User-Agent": "RentNeighbor/1.0" } }
          );
          const data = await res.json();
          const addr = data.address;
          // Build a readable location string
          const parts = [
            addr.neighbourhood || addr.suburb || addr.hamlet,
            addr.city || addr.town || addr.village,
            addr.state,
          ].filter(Boolean);
          setLocation(parts.join(", ") || data.display_name || `${latitude}, ${longitude}`);
        } catch {
          // Fallback to raw coordinates
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
      }
    );
  }

  return (
    <form
      onSubmit={handleSearch}
      className="flex gap-3 items-end flex-wrap bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm"
    >
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
          Search
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Power drill, camping tent..."
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>
      <div className="flex-1 min-w-[180px]" ref={locationWrapperRef}>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
          Location
        </label>
        <div className="flex gap-1.5 relative">
          <div className="relative flex-1">
            <input
              type="text"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Brooklyn, NY"
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoComplete="off"
            />
            {loadingSuggestions && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <svg className="w-3.5 h-3.5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                {suggestions.map((s) => {
                  const { primary, secondary } = formatSuggestionLabel(s);
                  return (
                    <li key={s.place_id}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent input blur before click fires
                          selectSuggestion(s);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-green-50 transition-colors flex items-start gap-2 border-b border-gray-50 last:border-0"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 truncate">{primary}</p>
                          {secondary && <p className="text-xs text-gray-400 truncate">{secondary}</p>}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="shrink-0 flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 hover:border-green-300 transition-colors disabled:opacity-50"
          >
            {locating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
            )}
            {locating ? "Locating..." : "Near me"}
          </button>
        </div>
      </div>
      <button
        type="submit"
        className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
      >
        Search
      </button>
    </form>
  );
}

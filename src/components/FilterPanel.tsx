"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
}

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "well_worn", label: "Well Worn" },
];

const RADIUS_OPTIONS = [
  { value: "5", label: "5 miles" },
  { value: "10", label: "10 miles" },
  { value: "25", label: "25 miles" },
  { value: "50", label: "50 miles" },
  { value: "100", label: "100 miles" },
];

export default function FilterPanel({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(
    Number(searchParams.get("minPrice")) || 0
  );
  const [maxPrice, setMaxPrice] = useState(
    Number(searchParams.get("maxPrice")) || 200
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || []
  );
  const [priceType, setPriceType] = useState(
    searchParams.get("priceType") || "day"
  );
  const [sortBy, setSortBy] = useState(
    searchParams.get("sort") || "newest"
  );
  const [radius, setRadius] = useState(
    searchParams.get("radius") || "50"
  );
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    searchParams.get("conditions")?.split(",").filter(Boolean) || []
  );

  const hasLocation = !!searchParams.get("location");

  const applyFilters = useCallback(
    (overrides?: Record<string, string | string[] | number>) => {
      const params = new URLSearchParams();
      const q = searchParams.get("q");
      const location = searchParams.get("location");
      const perPage = searchParams.get("perPage");
      if (q) params.set("q", q);
      if (location) params.set("location", location);
      if (perPage) params.set("perPage", perPage);
      // Reset to page 1 when filters change

      const effectiveMin =
        overrides?.minPrice !== undefined
          ? (overrides.minPrice as number)
          : minPrice;
      const effectiveMax =
        overrides?.maxPrice !== undefined
          ? (overrides.maxPrice as number)
          : maxPrice;
      const effectiveCats =
        overrides?.categories !== undefined
          ? (overrides.categories as string[])
          : selectedCategories;
      const effectivePriceType =
        overrides?.priceType !== undefined
          ? (overrides.priceType as string)
          : priceType;
      const effectiveSort =
        overrides?.sort !== undefined ? (overrides.sort as string) : sortBy;
      const effectiveRadius =
        overrides?.radius !== undefined ? (overrides.radius as string) : radius;
      const effectiveConditions =
        overrides?.conditions !== undefined
          ? (overrides.conditions as string[])
          : selectedConditions;

      if (effectiveMin > 0) params.set("minPrice", String(effectiveMin));
      if (effectiveMax < 200) params.set("maxPrice", String(effectiveMax));
      if (effectiveCats.length > 0)
        params.set("categories", effectiveCats.join(","));
      if (effectivePriceType !== "day")
        params.set("priceType", effectivePriceType);
      if (effectiveSort !== "newest" && effectiveSort !== "relevance")
        params.set("sort", effectiveSort);
      if (effectiveRadius && effectiveRadius !== "50")
        params.set("radius", effectiveRadius);
      if (effectiveConditions.length > 0)
        params.set("conditions", effectiveConditions.join(","));

      router.push(`/?${params.toString()}`);
    },
    [
      searchParams,
      minPrice,
      maxPrice,
      selectedCategories,
      priceType,
      sortBy,
      radius,
      selectedConditions,
      router,
    ]
  );

  function toggleCategory(slug: string) {
    const updated = selectedCategories.includes(slug)
      ? selectedCategories.filter((s) => s !== slug)
      : [...selectedCategories, slug];
    setSelectedCategories(updated);
    applyFilters({ categories: updated });
  }

  function handleMinPriceChange(val: number) {
    const clamped = Math.min(val, maxPrice);
    setMinPrice(clamped);
    applyFilters({ minPrice: clamped });
  }

  function handleMaxPriceChange(val: number) {
    const clamped = Math.max(val, minPrice);
    setMaxPrice(clamped);
    applyFilters({ maxPrice: clamped });
  }

  function handlePriceTypeChange(val: string) {
    setPriceType(val);
    applyFilters({ priceType: val });
  }

  function handleSortChange(val: string) {
    setSortBy(val);
    applyFilters({ sort: val });
  }

  function handleRadiusChange(val: string) {
    setRadius(val);
    applyFilters({ radius: val });
  }

  function toggleCondition(value: string) {
    const updated = selectedConditions.includes(value)
      ? selectedConditions.filter((v) => v !== value)
      : [...selectedConditions, value];
    setSelectedConditions(updated);
    applyFilters({ conditions: updated });
  }

  function clearFilters() {
    setMinPrice(0);
    setMaxPrice(200);
    setSelectedCategories([]);
    setSelectedConditions([]);
    setPriceType("day");
    setSortBy("newest");
    setRadius("50");
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    const location = searchParams.get("location");
    const perPage = searchParams.get("perPage");
    if (q) params.set("q", q);
    if (location) params.set("location", location);
    if (perPage) params.set("perPage", perPage);
    router.push(`/?${params.toString()}`);
  }

  const hasFilters =
    minPrice > 0 ||
    maxPrice < 200 ||
    selectedCategories.length > 0 ||
    selectedConditions.length > 0 ||
    priceType !== "day" ||
    (sortBy !== "newest" && sortBy !== "relevance") ||
    (radius !== "" && radius !== "50");

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 text-sm">Filters</h2>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-green-600 hover:text-green-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="px-5 py-4 border-b border-gray-100">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
          Sort By
        </label>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="relevance">Most Relevant</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="distance">Nearest First</option>
        </select>
      </div>

      {/* Distance */}
      <div className="px-5 py-4 border-b border-gray-100">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Distance
        </label>
        {!hasLocation && (
          <p className="text-xs text-gray-400 italic">
            Enter a location above to filter by distance
          </p>
        )}
        {hasLocation && (
          <div className="space-y-1.5">
            {RADIUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="radius"
                  value={opt.value}
                  checked={radius === opt.value}
                  onChange={() => handleRadiusChange(opt.value)}
                  className="border-gray-300 text-green-600 focus:ring-green-500 h-3.5 w-3.5"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="px-5 py-4 border-b border-gray-100">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Price Range
        </label>

        <div className="flex gap-1.5 mb-4">
          <button
            onClick={() => handlePriceTypeChange("day")}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              priceType === "day"
                ? "bg-green-600 text-white font-medium"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Per Day
          </button>
          <button
            onClick={() => handlePriceTypeChange("week")}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              priceType === "week"
                ? "bg-green-600 text-white font-medium"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Per Week
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Minimum</span>
              <span className="font-medium text-gray-700">${minPrice}</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={minPrice}
              onChange={(e) => handleMinPriceChange(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-600"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Maximum</span>
              <span className="font-medium text-gray-700">
                {maxPrice >= 200 ? "$200+" : `$${maxPrice}`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={maxPrice}
              onChange={(e) => handleMaxPriceChange(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-600"
            />
          </div>
        </div>

        <div className="mt-3 text-center">
          <span className="inline-block text-xs bg-green-50 text-green-700 font-medium px-3 py-1 rounded-full">
            ${minPrice} &ndash; {maxPrice >= 200 ? "$200+" : `$${maxPrice}`} /{" "}
            {priceType}
          </span>
        </div>
      </div>

      {/* Categories */}
      <div className="px-5 py-4 border-b border-gray-100">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Categories
        </label>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.slug)}
                onChange={() => toggleCategory(cat.slug)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-3.5 w-3.5"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Condition */}
      <div className="px-5 py-4">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Condition
        </label>
        <div className="space-y-2">
          {CONDITIONS.map((cond) => (
            <label
              key={cond.value}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selectedConditions.includes(cond.value)}
                onChange={() => toggleCondition(cond.value)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-3.5 w-3.5"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                {cond.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

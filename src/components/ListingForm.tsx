"use client";

import { useActionState, useState, useRef, useEffect, useCallback } from "react";
import { safeParseImageUrls } from "@/lib/utils";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface ListingFormProps {
  categories: Category[];
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    id?: string;
    title?: string;
    description?: string;
    pricePerDay?: number | null;
    pricePerWeek?: number | null;
    securityDeposit?: number | null;
    location?: string;
    categoryId?: number | null;
    contactEmail?: string;
    imageUrls?: string | null;
    condition?: string | null;
    status?: string;
    pricingMode?: string;
  };
}

export default function ListingForm({
  categories,
  action,
  defaultValues,
}: ListingFormProps) {
  const isEditing = !!defaultValues?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse existing images
  const existingImages: string[] = safeParseImageUrls(defaultValues?.imageUrls);

  const [uploadedUrls, setUploadedUrls] = useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Pricing suggestion state
  const [selectedCategory, setSelectedCategory] = useState(
    defaultValues?.categoryId ? String(defaultValues.categoryId) : ""
  );
  const [selectedCondition, setSelectedCondition] = useState(
    defaultValues?.condition ?? ""
  );
  const [locationValue, setLocationValue] = useState(
    defaultValues?.location ?? ""
  );
  const [priceSuggestion, setPriceSuggestion] = useState<{
    daily: { min: number; max: number; avg: number; count: number } | null;
    weekly: { min: number; max: number; avg: number; count: number } | null;
    totalCompared: number;
  } | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const suggestionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Location autocomplete (matches homepage SearchBar)
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
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const locationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationWrapperRef = useRef<HTMLDivElement>(null);

  function fetchLocationSuggestions(query: string) {
    if (locationTimeout.current) clearTimeout(locationTimeout.current);
    if (query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      return;
    }
    locationTimeout.current = setTimeout(async () => {
      setLoadingLocation(true);
      try {
        const res = await fetch(`/api/geocode?action=search&q=${encodeURIComponent(query)}`);
        const data: LocationSuggestion[] = await res.json();
        setLocationSuggestions(data);
        setShowLocationDropdown(data.length > 0);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setLoadingLocation(false);
      }
    }, 300);
  }

  function selectLocationSuggestion(suggestion: LocationSuggestion) {
    const addr = suggestion.address;
    const parts = [
      addr.city || addr.town || addr.village || suggestion.name,
      addr.state,
      addr.country,
    ].filter(Boolean);
    setLocationValue(parts.join(", ") || suggestion.display_name);
    setLocationSuggestions([]);
    setShowLocationDropdown(false);
  }

  function formatLocationLabel(suggestion: LocationSuggestion) {
    const addr = suggestion.address;
    const primary = addr.city || addr.town || addr.village || suggestion.name;
    const secondary = [addr.state || addr.county, addr.country].filter(Boolean).join(", ");
    return { primary, secondary };
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/geocode?action=reverse&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const addr = data.address;
          const parts = [
            addr.neighbourhood || addr.suburb || addr.hamlet,
            addr.city || addr.town || addr.village,
            addr.state,
          ].filter(Boolean);
          setLocationValue(parts.join(", ") || data.display_name || `${latitude}, ${longitude}`);
        } catch {
          setLocationValue(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocating(false);
      },
      () => setLocating(false)
    );
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(e.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestion = useCallback(
    (catId: string, cond: string, loc: string) => {
      if (!catId && !cond) {
        setPriceSuggestion(null);
        return;
      }
      if (suggestionTimeout.current) clearTimeout(suggestionTimeout.current);
      suggestionTimeout.current = setTimeout(async () => {
        setLoadingSuggestion(true);
        try {
          const params = new URLSearchParams();
          if (catId) params.set("categoryId", catId);
          if (cond) params.set("condition", cond);
          if (loc) params.set("location", loc);
          const res = await fetch(`/api/pricing-suggestion?${params}`);
          const data = await res.json();
          setPriceSuggestion(data.suggestion);
        } catch {
          setPriceSuggestion(null);
        } finally {
          setLoadingSuggestion(false);
        }
      }, 400);
    },
    []
  );

  useEffect(() => {
    fetchSuggestion(selectedCategory, selectedCondition, locationValue);
  }, [selectedCategory, selectedCondition, locationValue, fetchSuggestion]);

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const totalImages = uploadedUrls.length + fileArray.length;
    if (totalImages > 5) {
      setUploadError(`Maximum 5 images allowed. You have ${uploadedUrls.length}, trying to add ${fileArray.length}.`);
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    for (const file of fileArray) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }

      setUploadedUrls((prev) => [...prev, ...data.urls]);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setUploadedUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  async function formAction(_prevState: string | null, formData: FormData) {
    // Inject image URLs into the form data
    formData.set("imageUrls", uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : "");
    try {
      await action(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Something went wrong";
    }
  }

  const [error, submitAction, isPending] = useActionState(formAction, null);

  return (
    <form action={submitAction} className="space-y-4 max-w-xl">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaultValues?.title}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g., DeWalt Power Drill"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          defaultValue={defaultValues?.description}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Describe the item, its condition, and any rental terms..."
        />
      </div>

      {/* Pricing suggestion */}
      {loadingSuggestion && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-xs text-blue-600">
          Looking up similar listings...
        </div>
      )}
      {!loadingSuggestion && priceSuggestion && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-green-800 mb-1.5">
            Suggested pricing based on {priceSuggestion.totalCompared} similar listing{priceSuggestion.totalCompared !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-4">
            {priceSuggestion.daily && (
              <div className="text-xs text-green-700">
                <span className="text-gray-500">Per day:</span>{" "}
                <span className="font-medium">
                  ${priceSuggestion.daily.min.toFixed(0)}–${priceSuggestion.daily.max.toFixed(0)}
                </span>
                <span className="text-gray-400 ml-1">(avg ${priceSuggestion.daily.avg.toFixed(0)})</span>
              </div>
            )}
            {priceSuggestion.weekly && (
              <div className="text-xs text-green-700">
                <span className="text-gray-500">Per week:</span>{" "}
                <span className="font-medium">
                  ${priceSuggestion.weekly.min.toFixed(0)}–${priceSuggestion.weekly.max.toFixed(0)}
                </span>
                <span className="text-gray-400 ml-1">(avg ${priceSuggestion.weekly.avg.toFixed(0)})</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pricing mode
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="radio"
              name="pricingMode"
              value="pre_fee"
              defaultChecked={defaultValues?.pricingMode !== "post_fee"}
              className="accent-green-600"
            />
            Price is what I want to receive (renter pays more to cover 10% fee)
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="radio"
              name="pricingMode"
              value="post_fee"
              defaultChecked={defaultValues?.pricingMode === "post_fee"}
              className="accent-green-600"
            />
            Price is what the renter pays (10% fee comes out of my earnings)
          </label>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="pricePerDay" className="block text-sm font-medium text-gray-700 mb-1">
            Price per Day ($)
          </label>
          <input
            id="pricePerDay"
            name="pricePerDay"
            type="number"
            step="0.01"
            min="5"
            defaultValue={defaultValues?.pricePerDay ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-400 mt-1">Minimum $5/day</p>
        </div>
        <div>
          <label htmlFor="pricePerWeek" className="block text-sm font-medium text-gray-700 mb-1">
            Price per Week ($)
          </label>
          <input
            id="pricePerWeek"
            name="pricePerWeek"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.pricePerWeek ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-700 mb-1">
            Deposit ($)
          </label>
          <input
            id="securityDeposit"
            name="securityDeposit"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.securityDeposit ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Optional"
          />
          <p className="text-xs text-gray-400 mt-1">
            Returned when item comes back in good condition
          </p>
        </div>
      </div>

      <div ref={locationWrapperRef} className="relative">
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <div className="flex gap-1.5 relative">
          <div className="relative flex-1">
            <input
              id="location"
              name="location"
              type="text"
              required
              value={locationValue}
              onChange={(e) => {
                setLocationValue(e.target.value);
                fetchLocationSuggestions(e.target.value);
              }}
              onFocus={() => {
                if (locationSuggestions.length > 0) setShowLocationDropdown(true);
              }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Start typing a city or neighborhood..."
              autoComplete="off"
            />
            {loadingLocation && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <svg className="w-3.5 h-3.5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
            {showLocationDropdown && locationSuggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                {locationSuggestions.map((s) => {
                  const { primary, secondary } = formatLocationLabel(s);
                  return (
                    <li key={s.place_id}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectLocationSuggestion(s);
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
            className="shrink-0 flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 hover:border-green-300 transition-colors disabled:opacity-50"
          >
            {locating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            )}
            {locating ? "Locating..." : "Near me"}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={defaultValues?.categoryId ?? ""}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
          Condition
        </label>
        <select
          id="condition"
          name="condition"
          defaultValue={defaultValues?.condition ?? ""}
          onChange={(e) => setSelectedCondition(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select condition</option>
          <option value="new">New — never used, original packaging</option>
          <option value="like_new">Like New — used once or twice, no signs of wear</option>
          <option value="excellent">Excellent — minimal wear, works perfectly</option>
          <option value="good">Good — normal wear, fully functional</option>
          <option value="fair">Fair — noticeable wear but works fine</option>
          <option value="well_worn">Well Worn — heavy use, may have cosmetic issues</option>
        </select>
      </div>

      <div>
        <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
          Contact Email
        </label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          defaultValue={defaultValues?.contactEmail}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="your@email.com"
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Photos (up to 5)
        </label>

        {/* Uploaded image previews */}
        {uploadedUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {uploadedUrls.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-20 h-20 object-cover rounded border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        {uploadedUrls.length < 5 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50"
            }`}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading...
              </div>
            ) : (
              <>
                <svg className="mx-auto w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
                <p className="text-sm text-gray-500">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPEG, PNG, WebP, or GIF (max 5MB each)
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {uploadError && (
          <p className="text-red-600 text-xs mt-1.5">{uploadError}</p>
        )}
      </div>

      {isEditing && (
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="rented">Rented</option>
          </select>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || uploading}
        className="rounded bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isPending
          ? "Saving..."
          : isEditing
            ? "Update Listing"
            : "Post Listing"}
      </button>
    </form>
  );
}

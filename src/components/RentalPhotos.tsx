"use client";

import { useActionState, useState, useRef } from "react";

interface Photo {
  id: string;
  type: "check_in" | "check_out";
  photoUrl: string;
  notes: string | null;
  uploaderName: string;
  createdAt: string;
}

interface RentalPhotosProps {
  listingId: string;
  photos: Photo[];
  isLoggedIn: boolean;
  hasDeposit: boolean;
  listingStatus: string;
  submitAction: (formData: FormData) => Promise<void>;
}

export default function RentalPhotos({
  listingId,
  photos,
  isLoggedIn,
  hasDeposit,
  listingStatus,
  submitAction,
}: RentalPhotosProps) {
  const [showForm, setShowForm] = useState(false);
  const [photoType, setPhotoType] = useState<"check_in" | "check_out">(
    "check_in"
  );
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkInPhotos = photos.filter((p) => p.type === "check_in");
  const checkOutPhotos = photos.filter((p) => p.type === "check_out");

  const hasCheckIn = checkInPhotos.length > 0;
  const hasCheckOut = checkOutPhotos.length > 0;

  async function formAction(_prevState: string | null, formData: FormData) {
    try {
      await submitAction(formData);
      setPhotoUrl("");
      setShowForm(false);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Something went wrong";
    }
  }

  const [error, action, isPending] = useActionState(formAction, null);

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Condition Photos
        </h2>
        {isLoggedIn && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            {showForm ? "Cancel" : "Add Photos"}
          </button>
        )}
      </div>

      {hasDeposit ? (
        <p className="text-xs text-gray-500 mb-4">
          This listing has a security deposit. Condition photos are{" "}
          <strong className="text-gray-700">required</strong> before and after
          the rental to protect both parties.
        </p>
      ) : (
        <p className="text-xs text-gray-400 mb-4">
          Document item condition before and after rental to protect both
          parties.
        </p>
      )}

      {/* Required photo status checklist */}
      {hasDeposit && (
        <div className="flex gap-3 mb-5">
          <div
            className={`flex-1 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
              hasCheckIn
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {hasCheckIn ? (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            )}
            <span>
              Check-in {hasCheckIn ? `(${checkInPhotos.length} photo${checkInPhotos.length !== 1 ? "s" : ""})` : "(required)"}
            </span>
          </div>
          <div
            className={`flex-1 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
              hasCheckOut
                ? "border-green-200 bg-green-50 text-green-700"
                : listingStatus === "rented"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-gray-200 bg-gray-50 text-gray-400"
            }`}
          >
            {hasCheckOut ? (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : listingStatus === "rented" ? (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth={2} />
              </svg>
            )}
            <span>
              Check-out {hasCheckOut ? `(${checkOutPhotos.length} photo${checkOutPhotos.length !== 1 ? "s" : ""})` : listingStatus === "rented" ? "(needed on return)" : "(after rental)"}
            </span>
          </div>
        </div>
      )}

      {/* Upload form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-3">
              {error}
            </div>
          )}

          <form action={action} className="space-y-3">
            <input type="hidden" name="listingId" value={listingId} />

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Photo Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoType("check_in")}
                  className={`flex-1 text-sm py-2 rounded-lg transition-colors ${
                    photoType === "check_in"
                      ? "bg-blue-600 text-white font-medium"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Check-In (Before)
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoType("check_out")}
                  className={`flex-1 text-sm py-2 rounded-lg transition-colors ${
                    photoType === "check_out"
                      ? "bg-orange-600 text-white font-medium"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Check-Out (After)
                </button>
              </div>
              <input type="hidden" name="type" value={photoType} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Photo {hasDeposit && <span className="text-red-500">*</span>}
              </label>
              <input type="hidden" name="photoUrl" value={photoUrl} />
              {photoUrl ? (
                <div className="relative inline-block">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl("");
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    x
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500 hover:border-gray-400 transition-colors"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    "Click to upload a photo"
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  const fd = new FormData();
                  fd.append("files", file);
                  try {
                    const res = await fetch("/api/upload", {
                      method: "POST",
                      body: fd,
                    });
                    const data = await res.json();
                    if (res.ok && data.urls?.[0]) {
                      setPhotoUrl(data.urls[0]);
                    }
                  } catch {
                    // upload failed silently
                  } finally {
                    setUploading(false);
                    e.target.value = "";
                  }
                }}
              />
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5"
              >
                Notes (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="e.g., Small scratch on left side, otherwise great condition"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !photoUrl}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Submitting..." : "Submit Photo"}
            </button>
          </form>
        </div>
      )}

      {/* Photo timeline */}
      {photos.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No condition photos yet</p>
          <p className="text-gray-300 text-xs mt-1">
            {isLoggedIn
              ? 'Click "Add Photos" to document item condition'
              : "Log in to add condition photos"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Check-in photos */}
          {checkInPhotos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-blue-700 flex items-center gap-2 mb-3">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                Check-In (Before Rental)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {checkInPhotos.map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} />
                ))}
              </div>
            </div>
          )}

          {/* Check-out photos */}
          {checkOutPhotos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-orange-700 flex items-center gap-2 mb-3">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                Check-Out (After Rental)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {checkOutPhotos.map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PhotoCard({ photo }: { photo: Photo }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="aspect-[4/3] bg-gray-100">
        <img
          src={photo.photoUrl}
          alt={`${photo.type === "check_in" ? "Check-in" : "Check-out"} photo`}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-2.5">
        {photo.notes && (
          <p className="text-xs text-gray-600 mb-1.5">{photo.notes}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            by {photo.uploaderName}
          </span>
          <span className="text-[11px] text-gray-400">{photo.createdAt}</span>
        </div>
      </div>
    </div>
  );
}

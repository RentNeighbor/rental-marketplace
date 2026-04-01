import Link from "next/link";
import ReportFlag from "./ReportFlag";

interface ListingCardProps {
  id: string;
  title: string;
  pricePerDay: number | null;
  pricePerWeek: number | null;
  location: string;
  categoryName?: string;
  imageUrls: string | null;
  status: string;
  securityDeposit?: number | null;
  distance?: number | null;
  showReportFlag?: boolean;
  rentalCount?: number;
  viewCount?: number;
}

export default function ListingCard({
  id,
  title,
  pricePerDay,
  pricePerWeek,
  location,
  imageUrls,
  status,
  securityDeposit,
  distance,
  showReportFlag,
  rentalCount,
  viewCount,
}: ListingCardProps) {
  const images = imageUrls ? JSON.parse(imageUrls) : [];
  const price = pricePerDay
    ? `$${pricePerDay}/day`
    : pricePerWeek
      ? `$${pricePerWeek}/week`
      : "Contact for price";

  return (
    <div className="relative group rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md hover:border-gray-300 transition-all">
      {showReportFlag && <ReportFlag listingId={id} />}
      <Link href={`/listing/${id}`} className="block">
        <div className="aspect-[3/2] bg-gray-100 flex items-center justify-center overflow-hidden">
          {images.length > 0 ? (
            <img
              src={images[0]}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-300">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                />
              </svg>
              <span className="text-xs">No photo</span>
            </div>
          )}
        </div>
        <div className="px-2.5 py-2">
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="font-medium text-gray-900 text-[13px] leading-snug truncate">
              {title}
            </h3>
            {status === "rented" && (
              <span className="shrink-0 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
                Rented
              </span>
            )}
          </div>
          <p className="text-green-700 font-semibold text-xs mt-0.5">{price}</p>
          {securityDeposit && (
            <p className="text-amber-700 text-[11px] mt-0.5">
              ${securityDeposit} deposit
            </p>
          )}
          <p className="text-gray-400 text-xs mt-1 truncate">
            {location}
            {distance !== null && distance !== undefined && (
              <span className="text-blue-500"> &middot; {distance} mi</span>
            )}
          </p>
          {(!!rentalCount || !!viewCount) && (
            <p className="text-gray-300 text-[10px] mt-1">
              {rentalCount ? `Rented ${rentalCount}x` : ""}
              {rentalCount && viewCount ? " · " : ""}
              {viewCount ? `${viewCount} views` : ""}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

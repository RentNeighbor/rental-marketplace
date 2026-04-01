"use client";

import dynamic from "next/dynamic";

const ListingMap = dynamic(() => import("./ListingMap"), { ssr: false });

export default function ListingMapWrapper({
  lat,
  lng,
  listingId,
}: {
  lat: number;
  lng: number;
  listingId: string;
}) {
  return <ListingMap lat={lat} lng={lng} listingId={listingId} />;
}

import { NextRequest } from "next/server";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action"); // "search" or "reverse"

  if (action === "search") {
    const q = searchParams.get("q");
    if (!q) return Response.json([], { status: 400 });

    const res = await fetch(
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&featuretype=city`,
      { headers: { "User-Agent": "RentNeighbor/1.0 (https://rentneighbor.com)" } }
    );
    const data = await res.json();
    return Response.json(data);
  }

  if (action === "reverse") {
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    if (!lat || !lon) return Response.json({ error: "Missing lat/lon" }, { status: 400 });

    const res = await fetch(
      `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: { "User-Agent": "RentNeighbor/1.0 (https://rentneighbor.com)" } }
    );
    const data = await res.json();
    return Response.json(data);
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}

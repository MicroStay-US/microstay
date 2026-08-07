import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDistance } from "@/lib/getDistance";

export async function GET(req: NextRequest) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { searchParams } = new URL(req.url);

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  const { data, error } = await supabase
    .from("properties")
    .select("*");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const hotels = data ?? [];

  const hotelsWithDistance = hotels.map((hotel) => ({
    ...hotel,
    distance: getDistance(
      lat,
      lng,
      hotel.latitude,
      hotel.longitude
    ),
  }));

  hotelsWithDistance.sort(
    (a, b) => a.distance - b.distance
  );

  return NextResponse.json(hotelsWithDistance);
}
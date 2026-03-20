import { NextResponse } from "next/server";

import { getStoredSummary } from "@/lib/experiment-store";
import { PRODUCT } from "@/lib/reviews";

export const runtime = "nodejs";

export async function GET() {
  const summary = await getStoredSummary();

  return NextResponse.json({
    ok: true,
    product: {
      name: PRODUCT.name,
      averageRating: PRODUCT.averageRating,
      totalReviews: PRODUCT.totalReviews
    },
    tracking: summary
  });
}

import { revalidateTag } from "next/cache";
import { logSponsorshipBookingCreated } from "@/instrumentation";
import { apiErrorResponse } from "@/lib/api-error";
import {
  createSponsorshipBooking,
  SPONSORSHIP_CACHE_TAG,
} from "@/lib/services/sponsorships";

export async function POST(request: Request) {
  try {
    const sponsorship = await createSponsorshipBooking(request);
    // An admin booking is live at once; never serve the old sponsor list.
    if (sponsorship.status === "APPROVED") {
      revalidateTag(SPONSORSHIP_CACHE_TAG, { expire: 0 });
    }
    await logSponsorshipBookingCreated(sponsorship.status);
    return Response.json({ sponsorship }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(
      error,
      "Unable to save the booking. Please try again.",
    );
  }
}

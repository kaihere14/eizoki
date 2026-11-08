import { Suspense } from "react";
import { NavbarSponsorLinks } from "@/components/navbar-sponsor-links";
import { getLiveNavbarSponsors } from "@/lib/services/sponsorships";

async function LiveNavbarSponsors() {
  return <NavbarSponsorLinks sponsors={await getLiveNavbarSponsors()} />;
}

/** Cached server read of the live navbar sponsors, streamed into the navbar. */
export function NavbarSponsors() {
  return (
    <Suspense fallback={<NavbarSponsorLinks sponsors={[]} />}>
      <LiveNavbarSponsors />
    </Suspense>
  );
}

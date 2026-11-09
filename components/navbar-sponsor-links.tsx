"use client";

import { useState } from "react";
import { Globe, Plus } from "lucide-react";
import { HoverHint } from "@/components/navbar";
import { SPONSOR_CAPACITY, type PublicSponsor } from "@/lib/sponsorships";

const ICON_CLASS =
  "relative w-7 h-7 rounded-[7px] flex items-center justify-center overflow-hidden bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(9,9,11,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 active:scale-[0.94] transition-transform duration-150 cursor-pointer";

function SponsorIcon({ sponsor }: { sponsor: PublicSponsor }) {
  const [failed, setFailed] = useState(false);
  return (
    <HoverHint label={sponsor.productName}>
      <a
        href={sponsor.href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={`${sponsor.productName} — opens in a new tab`}
        className={ICON_CLASS}
      >
        {sponsor.iconUrl && !failed ? (
          // Icons come from ImageKit, /public or the sponsor's own site.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sponsor.iconUrl}
            alt=""
            width={28}
            height={28}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="w-full h-full object-contain"
          />
        ) : (
          <Globe className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
        )}
      </a>
    </HoverHint>
  );
}

/** Live sponsors, then an invitation while a navbar slot is still free. */
export function NavbarSponsorLinks({ sponsors }: { sponsors: PublicSponsor[] }) {
  return (
    <>
      {sponsors.map((sponsor) => (
        <SponsorIcon key={sponsor.id} sponsor={sponsor} />
      ))}
      {sponsors.length < SPONSOR_CAPACITY.NAVBAR && (
        <HoverHint label="Sponsor">
          {/* A fresh visit also clears an open booking when already on /sponsor. */}
          <a
            href="/sponsor"
            aria-label="Sponsor"
            className="relative w-7 h-7 rounded-[7px] flex items-center justify-center text-zinc-400 bg-zinc-50/40 border border-dashed border-zinc-300 hover:text-brand hover:bg-brand/5 hover:border-brand/70 focus-visible:outline-none focus-visible:border-brand focus-visible:text-brand active:scale-[0.94] transition-[background-color,border-color,color,transform] duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.9} />
          </a>
        </HoverHint>
      )}
    </>
  );
}

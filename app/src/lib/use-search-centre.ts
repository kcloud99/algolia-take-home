import { useCallback, useEffect, useState } from 'react';

import type { SearchCentre } from './geo';
import { DEFAULT_MARKET, MARKETS } from './markets';

/**
 * The two sources that are not a market. They double as the location control's option values, so the
 * control has one `<select>` and no parallel state of its own.
 */
export const DEVICE = 'device';
export const NETWORK = 'network';
export const NO_LOCATION = 'none';

/** `device` | `network` | `none` | a market label. */
export type CentreChoice = string;

/**
 * Where the board searches from, and how that gets decided.
 *
 * **The browser is never prompted for permission on load.** The Permissions API is asked whether
 * geolocation is *already* granted, and the position is only read if it is. A permission dialog that
 * appears before the diner has seen a single result is the wrong trade on any site, and on a demo run
 * live over a call it is a modal across the screen. Granting once makes it automatic from then on;
 * until then the diner asks for it explicitly, from the control.
 *
 * So the resolution order is: **an already-granted precise position → New York.** The project's design
 * notes specified a longer chain with `aroundLatLngViaIP` as the automatic second link, and it works —
 * measured from this machine it resolved to the right city. It is offered in the control rather than
 * applied silently, for two reasons. Algolia documents it as IPv4-only and unreliable behind a VPN, so
 * a silent network guess can relocate the board without saying so; and every figure in this repo's docs
 * is quoted from New York, so a deployed link that opens somewhere else stops being checkable. The
 * fourth link the notes called for — a default market behind a failing IP lookup — is not needed at
 * all: `aroundRadius: "all"` means no centre ever produces an empty board, so there is no failure to
 * rescue.
 */
export function useSearchCentre() {
  const [centre, setCentre] = useState<SearchCentre>({ kind: 'market', market: DEFAULT_MARKET });
  const [notice, setNotice] = useState<string | null>(null);

  // Adopt a precise position if the diner has already granted it. Runs once; `cancelled` guards the
  // async resolution against a unmount in between.
  useEffect(() => {
    let cancelled = false;

    void grantedPosition().then((position) => {
      if (!cancelled && position) {
        setCentre({ kind: 'device', lat: position.coords.latitude, lng: position.coords.longitude });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const choose = useCallback((choice: CentreChoice) => {
    setNotice(null);

    if (choice === DEVICE) {
      // The only path that prompts, because the diner just asked for it.
      requestPosition().then(
        (position) =>
          setCentre({ kind: 'device', lat: position.coords.latitude, lng: position.coords.longitude }),
        // Denied, unavailable, or timed out. The centre is left where it was rather than reset, so a
        // refused prompt costs the diner nothing — and the copy says only that, because the centre it
        // falls back to could be any of the other three kinds.
        () => setNotice('Location unavailable — still searching from the same place.'),
      );
      return;
    }

    if (choice === NETWORK) {
      setCentre({ kind: 'network' });
      return;
    }

    if (choice === NO_LOCATION) {
      setCentre({ kind: 'none' });
      return;
    }

    const market = MARKETS.find((candidate) => candidate.label === choice);
    if (market) {
      setCentre({ kind: 'market', market });
    }
  }, []);

  return { centre, choice: choiceOf(centre), choose, notice };
}

/** The control is driven off the centre rather than off its own state, so the two cannot disagree. */
function choiceOf(centre: SearchCentre): CentreChoice {
  switch (centre.kind) {
    case 'market':
      return centre.market.label;
    case 'device':
      return DEVICE;
    case 'network':
      return NETWORK;
    case 'none':
      return NO_LOCATION;
  }
}

/** A position, but only if permission is already granted — this must never trigger a prompt. */
async function grantedPosition(): Promise<GeolocationPosition | null> {
  if (!navigator.geolocation || !navigator.permissions) {
    return null;
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    if (permission.state !== 'granted') {
      return null;
    }
    return await requestPosition();
  } catch {
    // Safari has shipped `permissions.query` for geolocation only recently, and a rejection here means
    // we cannot know the state — which resolves to "do not prompt".
    return null;
  }
}

function requestPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
  });
}

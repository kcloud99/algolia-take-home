import { FederatedSearch } from './federated-search';
import { LocationControl } from './location-control';
import type { SearchCentre } from '../lib/geo';
import type { CentreChoice } from '../lib/use-search-centre';

/**
 * The masthead: the mark, the search field, and where the index is searching from.
 *
 * On paper rather than on a dark band. The previous system spent a full-width anthracite strip here to
 * signal "live information", which cost the page its calmest surface and made a black bar with a
 * floating white input the first thing anyone saw. The field is the most important control on the page,
 * so it is simply given the room and the weight — a tall white rectangle on paper, at the full width of
 * the measure.
 *
 * Sticky, because the search field is the one control that must never be more than a glance away.
 *
 * **The location control lives here, not with the filters.** It answers "where am I searching from",
 * which is a property of the search rather than a refinement of it — and the "Where" facet in the
 * refine rail, which genuinely does filter, uses the same place names. Sitting them in one strip was
 * the reason that distinction needed a paragraph of label copy to explain.
 *
 * The field itself is `FederatedSearch` — Autocomplete, which owns the input and must be the only thing
 * that does. `SearchBox` stood here until step 3.4 and was removed rather than kept alongside it.
 */
export function BoardStrip({
  centre,
  locationChoice,
  onChooseLocation,
  locationNotice,
}: {
  /**
   * The resolved centre, passed alongside the control's `choice` rather than derived from it. They are
   * not the same thing: `choice` is what the `<select>` shows, `centre` is the coordinate a query is
   * placed at, and only one of the two can be sent to Algolia. The search field needs the coordinate.
   */
  centre: SearchCentre;
  locationChoice: CentreChoice;
  onChooseLocation: (choice: CentreChoice) => void;
  locationNotice: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-5">
        {/* On a phone the mark and the location share a line, so the sticky masthead costs two rows of
            height instead of three. A sticky header that eats 40% of a 844px viewport is not a header. */}
        <div className="flex items-center justify-between gap-4 sm:contents">
          {/* The mark alone. No wordmark beside it: the mark already says OpenTable, and anything else
              there would either repeat it or invent a product name that is not theirs. It is also the
              one place a colour outside the palette could appear — and does not need to, because the
              palette's single accent was sampled from this file. */}
          <h1 className="shrink-0">
            <img
              src="/opentable-logo.png"
              alt="OpenTable restaurant search"
              width={38}
              height={38}
              className="size-[38px]"
            />
          </h1>

          {/* `sm:order-last` is load-bearing: `sm:contents` on the wrapper above dissolves it into the
              masthead's flex row, which would otherwise put the location before the search field. */}
          <LocationControl
            choice={locationChoice}
            onChoose={onChooseLocation}
            notice={locationNotice}
            className="sm:order-last"
          />
        </div>

        {/* Second in the source on a phone, but `sm:contents` above hoists the mark and the location
            back into this row on wider screens, so the desktop order is mark → search → location. */}
        <FederatedSearch centre={centre} />
      </div>
    </header>
  );
}

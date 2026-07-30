import { MARKETS } from '../lib/markets';
import { DEVICE, NETWORK, NO_LOCATION } from '../lib/use-search-centre';
import type { CentreChoice } from '../lib/use-search-centre';

/**
 * Where the board searches from, as one native `<select>`.
 *
 * One control rather than three, and native rather than custom. The alternative shape — a locate
 * button, plus a source badge, plus a market picker — is three things in a strip that already carries
 * filter chips and a sort. Folding the two dynamic sources in as options means the current source is
 * always the selected value, so the diner can read what the board is doing without a second label, and
 * a native select brings its own keyboard behaviour and its own mobile picker for free.
 *
 * Selecting "Your location" is the only path in the app that triggers a permission prompt, which is
 * deliberate — see `use-search-centre.ts`.
 *
 * The copy has one job beyond naming places: picking a market moves the **centre** the board ranks
 * around, it does not filter to that market. The "Where" facet in the signage panel is the control
 * that filters, and it uses the same names, so the distinction is worth making in the label.
 */
export function LocationControl({
  choice,
  onChoose,
  notice,
}: {
  choice: CentreChoice;
  onChoose: (choice: CentreChoice) => void;
  notice: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label className="flex items-center gap-2">
        <span className="font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase">Near</span>
        <select
          value={choice}
          onChange={(event) => onChoose(event.target.value)}
          className="min-h-11 max-w-[15rem] rounded-sm border border-hairline bg-porcelain px-2 py-1 text-sm sm:min-h-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <option value={DEVICE}>Your location</option>
          <option value={NETWORK}>Wherever your network says</option>
          <optgroup label="Markets">
            {MARKETS.map((market) => (
              <option key={market.label} value={market.label}>
                {market.label}
              </option>
            ))}
          </optgroup>
          {/* Geo off. Worth having as a first-class choice rather than a debug flag: it is the honest
              comparison for the whole bucketing decision, and switching to it live is how you show
              that distance is a ranking criterion here and not a filter. */}
          <option value={NO_LOCATION}>Anywhere in the US</option>
        </select>
      </label>

      {notice && <p className="text-xs text-stop">{notice}</p>}
    </div>
  );
}

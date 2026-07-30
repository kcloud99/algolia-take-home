import { MARKETS } from '../lib/markets';
import { DEVICE, NETWORK, NO_LOCATION } from '../lib/use-search-centre';
import type { CentreChoice } from '../lib/use-search-centre';

/**
 * Where the index searches from, as one native `<select>`.
 *
 * One control rather than three, and native rather than custom. The alternative shape — a locate
 * button, plus a source badge, plus a market picker — is three things in a masthead that also has to
 * hold the search field. Folding the two dynamic sources in as options means the current source is
 * always the selected value, so the diner can read what the search is doing without a second label,
 * and a native select brings its own keyboard behaviour and its own mobile picker for free.
 *
 * Selecting "Your location" is the only path in the app that triggers a permission prompt, which is
 * deliberate — see `use-search-centre.ts`.
 *
 * The copy has one job beyond naming places: picking a market moves the **centre** the index ranks
 * around, it does not filter to that market. The "Where" facet in the refine rail is the control that
 * filters, and it uses the same names, so the distinction is worth making in the label — which is also
 * why the two controls no longer sit in the same strip.
 */
export function LocationControl({
  choice,
  onChoose,
  notice,
  className = '',
}: {
  choice: CentreChoice;
  onChoose: (choice: CentreChoice) => void;
  notice: string | null;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <label className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[0.6875rem] font-semibold tracking-[0.1em] text-graphite uppercase">
          Near
        </span>
        <select
          value={choice}
          onChange={(event) => onChoose(event.target.value)}
          className="min-h-11 max-w-[14rem] min-w-0 rounded-sm border border-rule-strong bg-card px-2.5 py-1 text-sm font-medium transition-colors duration-[120ms] hover:border-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep sm:min-h-9"
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

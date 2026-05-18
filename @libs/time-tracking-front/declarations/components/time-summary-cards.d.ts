import type { TOC } from '@ember/component/template-only';
import type { SummaryResult } from '../services/time-entries.ts';
interface TimeSummaryCardsSignature {
    Args: {
        weekSummary: SummaryResult;
        monthSummary: SummaryResult;
    };
}
declare const TimeSummaryCards: TOC<TimeSummaryCardsSignature>;
export default TimeSummaryCards;
//# sourceMappingURL=time-summary-cards.d.ts.map
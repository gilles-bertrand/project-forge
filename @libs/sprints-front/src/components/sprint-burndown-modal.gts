import Component from "@glimmer/component";
import { service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { on } from "@ember/modifier";
import { t } from "ember-intl";
import type Owner from "@ember/owner";
import type SprintsService from "../services/sprints.ts";
import type { BurndownData } from "../services/sprints.ts";

interface SprintBurndownModalSignature {
  Args: {
    sprintId: string;
    sprintName?: string;
    onClose: () => void;
  };
}

// Fixed SVG viewport; the chart scales responsively via width=100%.
const W = 480;
const H = 240;
const PAD = { left: 36, right: 12, top: 12, bottom: 28 };

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default class SprintBurndownModal extends Component<SprintBurndownModalSignature> {
  @service declare sprints: SprintsService;

  @tracked data: BurndownData = { actual: [], ideal: [] };
  @tracked loading = true;
  @tracked error = "";

  constructor(owner: Owner, args: SprintBurndownModalSignature["Args"]) {
    super(owner, args);
    void this.load();
  }

  load = async () => {
    this.loading = true;
    this.error = "";
    try {
      this.data = await this.sprints.loadBurndown(this.args.sprintId);
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (!this.isDestroying && !this.isDestroyed) this.loading = false;
    }
  };

  viewBox = `0 0 ${String(W)} ${String(H)}`;

  get hasData(): boolean {
    return this.data.ideal.length > 0;
  }

  get plotW(): number {
    return W - PAD.left - PAD.right;
  }

  get plotH(): number {
    return H - PAD.top - PAD.bottom;
  }

  get maxY(): number {
    const vals = [
      ...this.data.ideal.map((p) => p.remaining),
      ...this.data.actual.map((p) => p.remaining),
      1,
    ];
    return Math.max(...vals);
  }

  private xFor(i: number, n: number): number {
    return PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * this.plotW);
  }

  private yFor(v: number): number {
    return PAD.top + (1 - v / this.maxY) * this.plotH;
  }

  get idealPoints(): string {
    const n = this.data.ideal.length;
    return this.data.ideal
      .map((p, i) => `${String(this.xFor(i, n))},${String(this.yFor(p.remaining))}`)
      .join(" ");
  }

  get actualPoints(): string {
    const n = this.data.ideal.length;
    return this.data.actual
      .map((p, i) => `${String(this.xFor(i, n))},${String(this.yFor(p.remaining))}`)
      .join(" ");
  }

  // Axis guides.
  get axisX0(): number {
    return PAD.left;
  }
  get axisX1(): number {
    return W - PAD.right;
  }
  get axisY0(): number {
    return PAD.top;
  }
  get axisY1(): number {
    return H - PAD.bottom;
  }

  get maxYLabel(): number {
    return Math.round(this.maxY);
  }

  get firstDayLabel(): string {
    const first = this.data.ideal[0];
    return first ? formatDay(first.day) : "";
  }

  get lastDayLabel(): string {
    const last = this.data.ideal[this.data.ideal.length - 1];
    return last ? formatDay(last.day) : "";
  }

  get currentRemaining(): number | null {
    const last = this.data.actual[this.data.actual.length - 1];
    return last ? Math.round(last.remaining) : null;
  }

  <template>
    <dialog class="modal modal-open" data-test-burndown-modal>
      <div class="modal-box max-w-2xl bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">
            {{t "sprints.burndown.title"}}
            {{#if @sprintName}}—
              <span class="opacity-70">{{@sprintName}}</span>{{/if}}
          </h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "sprints.burndown.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        {{#if this.loading}}
          <p class="text-sm italic opacity-60 py-8 text-center">
            {{t "sprints.burndown.loading"}}
          </p>
        {{else if this.hasData}}
          <div class="flex items-center gap-4 text-xs mb-2">
            <span class="flex items-center gap-1">
              <span class="inline-block w-4 border-t-2 border-primary"></span>
              {{t "sprints.burndown.actual"}}
            </span>
            <span class="flex items-center gap-1">
              <span
                class="inline-block w-4 border-t-2 border-dashed border-base-content opacity-50"
              ></span>
              {{t "sprints.burndown.ideal"}}
            </span>
            {{#if this.currentRemaining}}
              <span class="ml-auto opacity-70">
                {{t
                  "sprints.burndown.remaining"
                  points=this.currentRemaining
                }}
              </span>
            {{/if}}
          </div>

          <svg
            viewBox={{this.viewBox}}
            class="w-full h-auto"
            role="img"
            aria-label={{t "sprints.burndown.title"}}
            data-test-burndown-chart
          >
            {{! axes }}
            <line
              x1={{this.axisX0}}
              y1={{this.axisY0}}
              x2={{this.axisX0}}
              y2={{this.axisY1}}
              class="stroke-base-300"
              stroke-width="1"
            />
            <line
              x1={{this.axisX0}}
              y1={{this.axisY1}}
              x2={{this.axisX1}}
              y2={{this.axisY1}}
              class="stroke-base-300"
              stroke-width="1"
            />
            {{! ideal line (dashed) }}
            <polyline
              points={{this.idealPoints}}
              fill="none"
              class="stroke-base-content opacity-40"
              stroke-width="1.5"
              stroke-dasharray="4 3"
            />
            {{! actual line }}
            <polyline
              points={{this.actualPoints}}
              fill="none"
              class="stroke-primary"
              stroke-width="2"
              stroke-linejoin="round"
            />
            {{! y axis labels }}
            <text x="2" y={{this.axisY0}} class="fill-base-content text-[9px]">
              {{this.maxYLabel}}
            </text>
            <text x="2" y={{this.axisY1}} class="fill-base-content text-[9px]">0</text>
            {{! x axis labels }}
            <text
              x={{this.axisX0}}
              y="236"
              class="fill-base-content text-[9px]"
            >{{this.firstDayLabel}}</text>
            <text
              x="430"
              y="236"
              class="fill-base-content text-[9px]"
            >{{this.lastDayLabel}}</text>
          </svg>
        {{else}}
          <p
            class="text-sm italic opacity-60 py-8 text-center"
            data-test-burndown-empty
          >
            {{t "sprints.burndown.empty"}}
          </p>
        {{/if}}

        {{#if this.error}}
          <div
            class="alert alert-error text-xs mt-2"
            data-test-burndown-error
          >{{this.error}}</div>
        {{/if}}

        <div class="modal-action mt-4">
          <button
            type="button"
            class="btn btn-sm btn-primary"
            {{on "click" @onClose}}
          >{{t "sprints.burndown.close"}}</button>
        </div>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "sprints.burndown.closeAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}

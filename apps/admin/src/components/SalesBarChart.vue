<script setup>
import { formatMoney } from '@swiftmarket/shared';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * Gráfico de barras das vendas por dia (uma única série, por isso sem legenda: o título
 * do cartão já a nomeia). Barras com topo arredondado de 4px e base reta no eixo,
 * tooltip por barra (mouse e teclado), rótulo direto só no pico e visão em tabela.
 */
const props = defineProps({
  /** [{ day: 'YYYY-MM-DD', totalCents, orders }] */
  days: { type: Array, required: true },
});

const { t } = useI18n();

// Geometria (coordenadas do viewBox; o SVG escala com a largura do cartão).
const WIDTH = 560;
const HEIGHT = 240;
const PAD = { top: 22, right: 8, bottom: 30, left: 62 };
const BAR_WIDTH = 24;
const RADIUS = 4;

const plotWidth = WIDTH - PAD.left - PAD.right;
const plotHeight = HEIGHT - PAD.top - PAD.bottom;
const baseline = PAD.top + plotHeight;

const showTable = ref(false);
const activeIndex = ref(null);

const totalCents = computed(() => props.days.reduce((sum, day) => sum + day.totalCents, 0));

/** Arredonda o máximo para um valor "bonito" (1, 2, 5 × 10^n reais) para o eixo. */
function niceMax(cents) {
  const reais = Math.max(cents / 100, 1);
  const magnitude = 10 ** Math.floor(Math.log10(reais));
  const step = [1, 2, 5, 10].find((candidate) => reais <= candidate * magnitude);
  return step * magnitude * 100;
}

const axisMax = computed(() => niceMax(Math.max(...props.days.map((day) => day.totalCents), 0)));

const axisFormat = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const ticks = computed(() =>
  [0, 0.5, 1].map((ratio) => ({
    y: baseline - ratio * plotHeight,
    label: axisFormat.format((axisMax.value * ratio) / 100),
  })),
);

const slotWidth = plotWidth / Math.max(props.days.length, 1);

const parseDay = (day) => new Date(`${day}T12:00:00`);
const weekday = (day) =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(parseDay(day)).replace('.', '');
const dayNumber = (day) => day.slice(8, 10);
const longDate = (day) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(parseDay(day));

const peakIndex = computed(() => {
  if (totalCents.value === 0) return -1;
  return props.days.reduce(
    (best, day, index, all) => (day.totalCents > all[best].totalCents ? index : best),
    0,
  );
});

const bars = computed(() =>
  props.days.map((day, index) => {
    const height = (day.totalCents / axisMax.value) * plotHeight;
    const centerX = PAD.left + slotWidth * index + slotWidth / 2;
    const x = centerX - BAR_WIDTH / 2;
    const y = baseline - height;
    const r = Math.min(RADIUS, height / 2);

    return {
      ...day,
      index,
      centerX,
      topY: y,
      slotX: PAD.left + slotWidth * index,
      hasBar: height > 0,
      // Topo arredondado, base reta ancorada no eixo.
      path: `M${x},${baseline} V${y + r} Q${x},${y} ${x + r},${y} H${x + BAR_WIDTH - r} Q${x + BAR_WIDTH},${y} ${x + BAR_WIDTH},${y + r} V${baseline} Z`,
      label: `${weekday(day.day)} ${dayNumber(day.day)}`,
      ariaLabel: `${longDate(day.day)}: ${formatMoney(day.totalCents)}, ${t('dashboard.tooltipOrders', { count: day.orders })}`,
    };
  }),
);

const shortDate = (day) =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    parseDay(day),
  );

const tooltip = computed(() => {
  const bar = bars.value[activeIndex.value];
  if (!bar) return null;

  // Perto das bordas o tooltip se alinha à borda (em vez de centralizar) para não vazar do cartão.
  const ratio = bar.centerX / WIDTH;
  const shiftX = ratio > 0.7 ? '-100%' : ratio < 0.3 ? '0%' : '-50%';
  const anchorX =
    ratio > 0.7
      ? bar.centerX + BAR_WIDTH / 2
      : ratio < 0.3
        ? bar.centerX - BAR_WIDTH / 2
        : bar.centerX;

  return {
    left: `${(anchorX / WIDTH) * 100}%`,
    top: `${(Math.min(bar.topY, baseline - 8) / HEIGHT) * 100}%`,
    shiftX,
    title: shortDate(bar.day),
    value: formatMoney(bar.totalCents),
    orders: t('dashboard.tooltipOrders', { count: bar.orders }),
  };
});

const chartLabel = computed(() =>
  t('dashboard.chartLabel', { total: formatMoney(totalCents.value) }),
);
</script>

<template>
  <div class="chart">
    <div class="chart__top">
      <h3 class="card__title">{{ t('dashboard.salesChart') }}</h3>
      <button type="button" class="btn btn--outline btn--sm" @click="showTable = !showTable">
        {{ showTable ? t('dashboard.chartGraph') : t('dashboard.chartTable') }}
      </button>
    </div>

    <div v-if="!showTable" class="chart__plot">
      <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" role="group" :aria-label="chartLabel">
        <!-- Grade recessiva + rótulos do eixo -->
        <g v-for="tick in ticks" :key="tick.y">
          <line :x1="PAD.left" :x2="WIDTH - PAD.right" :y1="tick.y" :y2="tick.y" class="grid" />
          <text :x="PAD.left - 8" :y="tick.y + 4" text-anchor="end" class="axis-text">
            {{ tick.label }}
          </text>
        </g>

        <g v-for="bar in bars" :key="bar.day">
          <path
            v-if="bar.hasBar"
            :d="bar.path"
            class="bar"
            :class="{ 'is-active': activeIndex === bar.index }"
          />

          <text
            v-if="bar.index === peakIndex"
            :x="bar.centerX"
            :y="bar.topY - 6"
            text-anchor="middle"
            class="value-text"
          >
            {{ formatMoney(bar.totalCents) }}
          </text>

          <text :x="bar.centerX" :y="HEIGHT - 8" text-anchor="middle" class="axis-text">
            {{ bar.label }}
          </text>

          <!-- Área de toque/foco maior que a barra (slot inteiro) -->
          <rect
            :x="bar.slotX"
            :y="PAD.top"
            :width="slotWidth"
            :height="plotHeight + PAD.bottom"
            class="hit"
            tabindex="0"
            role="img"
            :aria-label="bar.ariaLabel"
            @mouseenter="activeIndex = bar.index"
            @mouseleave="activeIndex = null"
            @focus="activeIndex = bar.index"
            @blur="activeIndex = null"
          />
        </g>
      </svg>

      <div
        v-if="tooltip"
        class="chart__tooltip"
        :style="{
          left: tooltip.left,
          top: tooltip.top,
          // 28px acima do topo da barra: libera o rótulo de valor do pico.
          transform: `translate(${tooltip.shiftX}, calc(-100% - 28px))`,
        }"
      >
        <b>{{ tooltip.title }}</b>
        <span class="mono">{{ tooltip.value }}</span>
        <span>{{ tooltip.orders }}</span>
      </div>

      <p v-if="totalCents === 0" class="chart__empty">{{ t('dashboard.noSales') }}</p>
    </div>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('dashboard.colDay') }}</th>
            <th class="num">{{ t('dashboard.colSales') }}</th>
            <th class="num">{{ t('dashboard.colOrders') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bar in bars" :key="bar.day">
            <td>{{ longDate(bar.day) }}</td>
            <td class="num">{{ formatMoney(bar.totalCents) }}</td>
            <td class="num">{{ bar.orders }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.chart__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.chart__plot {
  position: relative;
}

svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.grid {
  stroke: var(--line);
  stroke-width: 1;
}

.axis-text {
  fill: var(--muted);
  font: 400 11px var(--font-mono);
}

.value-text {
  fill: var(--text);
  font: 700 11px var(--font-mono);
}

.bar {
  fill: var(--accent);
  opacity: 0.85;
  transition: opacity 0.12s;
}

.bar.is-active {
  opacity: 1;
}

.hit {
  fill: transparent;
  cursor: pointer;
  outline: none;
}

.hit:focus-visible {
  stroke: var(--accent);
  stroke-width: 2;
  rx: 4;
}

.chart__tooltip {
  position: absolute;
  z-index: 2;
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-hover);
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
}

.chart__tooltip span {
  color: var(--muted);
}

.chart__tooltip .mono {
  color: var(--text);
  font-weight: 700;
}

.chart__empty {
  margin-top: 4px;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
}
</style>

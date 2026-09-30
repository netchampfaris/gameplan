<script setup lang="ts">
import { computed } from 'vue'
import { polar, RINGS, SECTOR_DEGREES, SECTORS, type Point } from '../world/dartboard'
import { areaPath, SWEEP_SPAN, wedgePath } from './dartAim'

/**
 * The dartboard in the darts dialog, drawn in SVG in the colours of the game's board
 * (`objects/Dartboard.ts`). It draws the aim markers and the darts; the dialog does the
 * timing and the scoring.
 */

const props = defineProps<{
  /** The marker sweeping across, or locked, in board radii. Null before aiming. */
  aimX: number | null
  /** The marker sweeping up and down, or locked. Null until the first is locked. */
  aimY: number | null
  /** Whether the across marker is locked, so it is drawn quieter. */
  xLocked: boolean
  /** Darts in the board, oldest first. The last one's scoring area lights up. */
  darts: Point[]
}>()

const COLORS = {
  surround: '#2c2437',
  wire: '#6b6275',
  dark: '#3a3340',
  light: '#efe2c4',
  red: '#d9534f',
  green: '#4fa36a',
  number: '#efe2c4',
  flight: '#ffd166',
}

const VIEW = SWEEP_SPAN + 0.1
const NUMBER_RADIUS = 1.14

const wedges = SECTORS.flatMap((number, index) => {
  const centre = index * SECTOR_DEGREES
  const from = centre - SECTOR_DEGREES / 2
  const to = centre + SECTOR_DEGREES / 2
  const even = index % 2 === 0
  const single = even ? COLORS.dark : COLORS.light
  const ring = even ? COLORS.red : COLORS.green
  return [
    {
      key: `${number}-inner`,
      d: wedgePath(RINGS.outerBull, RINGS.tripleInner, from, to),
      fill: single,
    },
    {
      key: `${number}-triple`,
      d: wedgePath(RINGS.tripleInner, RINGS.tripleOuter, from, to),
      fill: ring,
    },
    {
      key: `${number}-outer`,
      d: wedgePath(RINGS.tripleOuter, RINGS.doubleInner, from, to),
      fill: single,
    },
    {
      key: `${number}-double`,
      d: wedgePath(RINGS.doubleInner, RINGS.doubleOuter, from, to),
      fill: ring,
    },
  ]
})

const numbers = SECTORS.map((number, index) => ({
  number,
  ...polar(NUMBER_RADIUS, index * SECTOR_DEGREES),
}))

const lastDart = computed(() => props.darts[props.darts.length - 1] ?? null)
const lit = computed(() => (lastDart.value ? areaPath(lastDart.value) : null))
</script>

<template>
  <svg
    :viewBox="`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`"
    class="block h-auto w-full select-none"
    role="img"
    aria-label="Dartboard"
  >
    <circle r="1.24" :fill="COLORS.surround" />
    <path
      v-for="wedge in wedges"
      :key="wedge.key"
      :d="wedge.d"
      :fill="wedge.fill"
      :stroke="COLORS.wire"
      stroke-width="0.006"
    />
    <circle :r="RINGS.outerBull" :fill="COLORS.green" :stroke="COLORS.wire" stroke-width="0.006" />
    <circle :r="RINGS.bull" :fill="COLORS.red" :stroke="COLORS.wire" stroke-width="0.006" />
    <text
      v-for="label in numbers"
      :key="label.number"
      :x="label.x"
      :y="label.y"
      :fill="COLORS.number"
      font-size="0.12"
      font-weight="600"
      text-anchor="middle"
      dominant-baseline="central"
    >
      {{ label.number }}
    </text>

    <!-- The last dart's scoring area flashes. Keyed so each new dart flashes again. -->
    <path
      v-if="lit"
      :key="darts.length"
      :d="lit"
      fill="#ffffff"
      fill-rule="evenodd"
      class="dart-flash"
      pointer-events="none"
    />

    <g pointer-events="none">
      <g v-for="(dart, index) in darts" :key="index" :transform="`translate(${dart.x} ${dart.y})`">
        <circle r="0.045" :fill="COLORS.flight" :stroke="COLORS.surround" stroke-width="0.018" />
        <circle r="0.012" :fill="COLORS.surround" />
      </g>
    </g>

    <g pointer-events="none" stroke-linecap="round">
      <template v-if="aimX !== null">
        <line
          :x1="aimX"
          :x2="aimX"
          :y1="-VIEW"
          :y2="VIEW"
          :stroke="COLORS.surround"
          stroke-width="0.05"
          :opacity="xLocked ? 0.5 : 0.9"
        />
        <line
          :x1="aimX"
          :x2="aimX"
          :y1="-VIEW"
          :y2="VIEW"
          stroke="#ffffff"
          stroke-width="0.022"
          :opacity="xLocked ? 0.6 : 1"
        />
      </template>
      <template v-if="aimY !== null">
        <line
          :y1="aimY"
          :y2="aimY"
          :x1="-VIEW"
          :x2="VIEW"
          :stroke="COLORS.surround"
          stroke-width="0.05"
          opacity="0.9"
        />
        <line :y1="aimY" :y2="aimY" :x1="-VIEW" :x2="VIEW" stroke="#ffffff" stroke-width="0.022" />
      </template>
    </g>
  </svg>
</template>

<style scoped>
.dart-flash {
  animation: dart-flash 900ms ease-out forwards;
}

@keyframes dart-flash {
  from {
    opacity: 0.75;
  }
  to {
    opacity: 0.2;
  }
}
</style>

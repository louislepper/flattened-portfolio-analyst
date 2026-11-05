import { useMemo } from 'react';
import type { PieLabelRenderProps } from 'recharts';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Box from '@mui/material/Box';
import type { FlattenedAllocation } from '../../domain/types';
import type { TagBreakdownEntry } from '../../domain/types';
import type { AllocationKind, ViewMode } from '../../domain/types';
import { filterSmallAllocations } from '../../domain/display-filter';
import { formatPercentage } from '../../utils/format';

const COLORS = [
  '#1976d2',
  '#dc004e',
  '#ff9800',
  '#4caf50',
  '#9c27b0',
  '#00bcd4',
  '#795548',
  '#607d8b',
  '#e91e63',
  '#3f51b5',
];

const EVERYTHING_ELSE_COLOR = '#bdbdbd';
const UNKNOWN_COLOR = '#9e9e9e';
const NON_EQUITY_COLOR = '#90a4ae';
const UNRESOLVED_COLOR = '#b0bec5';
const MAX_PIE_SLICES = 19;

interface AllocationPieChartProps {
  readonly viewMode: ViewMode;
  readonly allocations: readonly FlattenedAllocation[];
  readonly tagBreakdown: readonly TagBreakdownEntry[];
}

interface ChartEntry {
  readonly name: string;
  readonly value: number;
  readonly percentage: number;
  readonly fill?: string;
}

// Per-fund aggregate rows are not companies: each kind is summed into one
// slice that is always shown, after the company slices.
const AGGREGATE_SLICES: readonly {
  readonly kind: AllocationKind;
  readonly name: string;
  readonly fill: string;
}[] = [
  { kind: 'non-equity', name: 'Non-equity', fill: NON_EQUITY_COLOR },
  { kind: 'unresolved', name: 'Unclassified', fill: UNRESOLVED_COLOR },
  { kind: 'unknown', name: 'Unknown', fill: UNKNOWN_COLOR },
];

function toChartData(
  viewMode: ViewMode,
  allocations: readonly FlattenedAllocation[],
  tagBreakdown: readonly TagBreakdownEntry[],
): ChartEntry[] {
  if (viewMode.kind === 'tag') {
    const visible = tagBreakdown.slice(0, MAX_PIE_SLICES);
    const overflow = tagBreakdown.slice(MAX_PIE_SLICES);
    const hasEverythingElse = overflow.length > 0;

    const entries = visible.map((entry) => ({
      name: entry.tagValue,
      value: entry.totalValueCents,
      percentage: entry.percentage,
    }));

    if (hasEverythingElse) {
      return [
        ...entries,
        {
          name: 'Everything else',
          value: overflow.reduce(
            (s, e) => s + e.totalValueCents, 0,
          ),
          percentage: overflow.reduce(
            (s, e) => s + e.percentage, 0,
          ),
          fill: EVERYTHING_ELSE_COLOR,
        },
      ];
    }

    return entries;
  }

  const knownAllocations = allocations.filter(
    (a) => a.kind === 'security',
  );

  const filtered = filterSmallAllocations(knownAllocations);
  const visible = filtered.visible.map((a) => ({
    name: a.ticker,
    value: a.totalValueCents,
    percentage: a.percentage,
  }));

  let restValue = filtered.hiddenValueCents;
  let restPercentage = filtered.hiddenPercentage;

  const entries: ChartEntry[] = visible.slice(0, MAX_PIE_SLICES);
  for (const overflow of visible.slice(MAX_PIE_SLICES)) {
    restValue += overflow.value;
    restPercentage += overflow.percentage;
  }

  const hasEverythingElse =
    filtered.hiddenCount > 0
    || visible.length > MAX_PIE_SLICES;

  if (hasEverythingElse) {
    entries.push({
      name: 'Everything else',
      value: restValue,
      percentage: restPercentage,
      fill: EVERYTHING_ELSE_COLOR,
    });
  }

  const aggregateEntries = AGGREGATE_SLICES.flatMap(({ kind, name, fill }) => {
    const rows = allocations.filter((a) => a.kind === kind);
    if (rows.length === 0) return [];
    return [{
      name,
      value: rows.reduce((s, a) => s + a.totalValueCents, 0),
      percentage: rows.reduce((s, a) => s + a.percentage, 0),
      fill,
    }];
  });

  return [...entries, ...aggregateEntries];
}

function renderLabel(props: PieLabelRenderProps): string {
  const name = String(props.name ?? '');
  const pct = (props as unknown as { percentage: number })
    .percentage;
  return `${name} ${formatPercentage(pct)}`;
}

export function AllocationPieChart({
  viewMode,
  allocations,
  tagBreakdown,
}: AllocationPieChartProps) {
  const data = useMemo(
    () => toChartData(viewMode, allocations, tagBreakdown),
    [viewMode, allocations, tagBreakdown],
  );

  if (data.length === 0) return null;

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <ResponsiveContainer width="100%" height={500}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={160}
            label={renderLabel}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={entry.fill ?? COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(
              _value,
              _name,
              props,
            ) => {
              const entry = props.payload as
                ChartEntry | undefined;
              if (!entry) return '';
              return formatPercentage(entry.percentage);
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}

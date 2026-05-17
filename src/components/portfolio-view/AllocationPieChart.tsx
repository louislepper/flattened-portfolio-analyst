import { useMemo } from 'react';
import type { PieLabelRenderProps } from 'recharts';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Box from '@mui/material/Box';
import type { FlattenedAllocation } from '../../domain/types';
import type { TagBreakdownEntry } from '../../domain/types';
import type { ViewMode } from '../../domain/types';
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
}

function toChartData(
  viewMode: ViewMode,
  allocations: readonly FlattenedAllocation[],
  tagBreakdown: readonly TagBreakdownEntry[],
): { entries: ChartEntry[]; hasEverythingElse: boolean; hasUnknown: boolean } {
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
      entries.push({
        name: 'Everything else',
        value: overflow.reduce(
          (s, e) => s + e.totalValueCents, 0,
        ),
        percentage: overflow.reduce(
          (s, e) => s + e.percentage, 0,
        ),
      });
    }

    return { entries, hasEverythingElse, hasUnknown: false };
  }

  const unknownAllocations = allocations.filter((a) => a.isUnknown);
  const knownAllocations = allocations.filter((a) => !a.isUnknown);

  const filtered = filterSmallAllocations(knownAllocations);
  const visible = filtered.visible.map((a) => ({
    name: a.ticker,
    value: a.totalValueCents,
    percentage: a.percentage,
  }));

  let restValue = filtered.hiddenValueCents;
  let restPercentage = filtered.hiddenPercentage;

  const entries = visible.slice(0, MAX_PIE_SLICES);
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
    });
  }

  const hasUnknown = unknownAllocations.length > 0;
  if (hasUnknown) {
    entries.push({
      name: 'Unknown',
      value: unknownAllocations.reduce(
        (s, a) => s + a.totalValueCents, 0,
      ),
      percentage: unknownAllocations.reduce(
        (s, a) => s + a.percentage, 0,
      ),
    });
  }

  return { entries, hasEverythingElse, hasUnknown };
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
  const { entries: data, hasEverythingElse, hasUnknown } = useMemo(
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
            {data.map((entry, index) => {
              const isUnknown =
                hasUnknown && index === data.length - 1;
              const isEverythingElse =
                hasEverythingElse
                && index === data.length - (hasUnknown ? 2 : 1);
              return (
                <Cell
                  key={entry.name}
                  fill={
                    isUnknown
                      ? UNKNOWN_COLOR
                      : isEverythingElse
                      ? EVERYTHING_ELSE_COLOR
                      : COLORS[index % COLORS.length]
                  }
                />
              );
            })}
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

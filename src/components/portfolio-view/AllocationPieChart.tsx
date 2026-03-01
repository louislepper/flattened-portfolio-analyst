import type { PieLabelRenderProps } from 'recharts';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import Box from '@mui/material/Box';
import type { FlattenedAllocation } from '../../domain/types';
import type { TagBreakdownEntry } from '../../domain/types';
import type { ViewMode } from '../../domain/types';
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
): ChartEntry[] {
  if (viewMode.kind === 'tag') {
    return tagBreakdown.map((entry) => ({
      name: entry.tagValue,
      value: entry.totalValueCents,
      percentage: entry.percentage,
    }));
  }

  return allocations.map((a) => ({
    name: a.ticker,
    value: a.totalValueCents,
    percentage: a.percentage,
  }));
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
  const data = toChartData(viewMode, allocations, tagBreakdown);

  if (data.length === 0) return null;

  return (
    <Box
      sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}
    >
      <PieChart width={500} height={400}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={140}
          label={renderLabel}
        >
          {data.map((_, index) => (
            <Cell
              key={data[index].name}
              fill={COLORS[index % COLORS.length]}
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
    </Box>
  );
}

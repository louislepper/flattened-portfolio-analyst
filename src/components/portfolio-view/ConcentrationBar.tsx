import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { FlattenedAllocation } from '../../domain/types';
import { filterSmallAllocations } from '../../domain/display-filter';
import { formatPercentage } from '../../utils/format';
import { colors, segmentColors, resolvingHatch } from '../../theme/tokens';

const MAX_SEGMENTS = 7;
const RESOLVING_HATCH_SWATCH =
  'repeating-linear-gradient(135deg,#d8d0c0,#d8d0c0 3px,#eee7da 3px,#eee7da 6px)';

interface ConcentrationBarProps {
  readonly allocations: readonly FlattenedAllocation[];
}

interface Segment {
  readonly label: string;
  readonly color: string;
  readonly pct: number;
}

export function ConcentrationBar({ allocations }: ConcentrationBarProps) {
  const { segments, elsePct, resolvingPct } = useMemo(() => {
    const known = allocations.filter((a) => !a.isUnknown);
    const resolving = allocations
      .filter((a) => a.isUnknown)
      .reduce((sum, a) => sum + a.percentage, 0);

    const visible = filterSmallAllocations(known).visible;
    const top = visible.slice(0, MAX_SEGMENTS);
    const segs: Segment[] = top.map((a, i) => ({
      label: a.ticker,
      color: segmentColors[i],
      pct: a.percentage * 100,
    }));

    const topSum = segs.reduce((s, x) => s + x.pct, 0);
    const elsePctValue = Math.max(0, 100 - topSum - resolving * 100);

    return {
      segments: segs,
      elsePct: elsePctValue,
      resolvingPct: resolving * 100,
    };
  }, [allocations]);

  if (segments.length === 0) return null;

  return (
    <Box sx={{ mb: 3.5 }}>
      <Typography
        sx={{ mb: 1, fontSize: 13, color: colors.inkMuted }}
      >
        Concentration — every ETF flattened into the companies
        underneath
      </Typography>
      <Box
        sx={{
          display: 'flex',
          height: 30,
          borderRadius: '7px',
          overflow: 'hidden',
          mb: 1.5,
        }}
      >
        {segments.map((s) => (
          <Box
            key={s.label}
            sx={{ width: `${s.pct}%`, bgcolor: s.color }}
          />
        ))}
        <Box sx={{ width: `${elsePct}%`, bgcolor: '#d2ccbf' }} />
        {resolvingPct > 0 && (
          <Box sx={{ width: `${resolvingPct}%`, background: resolvingHatch }} />
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 2.25, flexWrap: 'wrap' }}>
        {segments.map((s) => (
          <LegendItem
            key={s.label}
            swatch={s.color}
            label={s.label}
            pct={formatPercentage(s.pct / 100)}
          />
        ))}
        <LegendItem
          swatch="#d2ccbf"
          label="Everything else"
          pct={formatPercentage(elsePct / 100)}
        />
        {resolvingPct > 0 && (
          <LegendItem
            swatch={RESOLVING_HATCH_SWATCH}
            label="Still resolving"
            pct={formatPercentage(resolvingPct / 100)}
          />
        )}
      </Box>
    </Box>
  );
}

interface LegendItemProps {
  readonly swatch: string;
  readonly label: string;
  readonly pct: string;
}

function LegendItem({ swatch, label, pct }: LegendItemProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875 }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '3px',
          background: swatch,
        }}
      />
      <Box component="span" sx={{ fontSize: 12.5, color: '#5b5b52' }}>
        {label}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: 12.5,
          color: '#a8a89c',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {pct}
      </Box>
    </Box>
  );
}

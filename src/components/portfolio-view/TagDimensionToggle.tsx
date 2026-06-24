import Box from '@mui/material/Box';
import { colors } from '../../theme/tokens';

export interface TagDimension {
  readonly key: string;
  readonly name: string;
}

interface TagDimensionToggleProps {
  readonly options: readonly TagDimension[];
  readonly selectedKey: string | null;
  readonly onSelect: (dimension: TagDimension) => void;
}

export function TagDimensionToggle({
  options,
  selectedKey,
  onSelect,
}: TagDimensionToggleProps) {
  if (options.length === 0) return null;

  return (
    <Box
      role="tablist"
      sx={{
        display: 'flex',
        gap: 0.5,
        p: 0.5,
        bgcolor: '#f2ede4',
        borderRadius: '11px',
        flexWrap: 'wrap',
      }}
    >
      {options.map((option) => {
        const selected = option.key === selectedKey;
        return (
          <Box
            key={option.key}
            role="tab"
            tabIndex={0}
            aria-selected={selected}
            onClick={() => onSelect(option)}
            sx={{
              px: 2,
              py: 1.125,
              borderRadius: '8px',
              fontSize: 13.5,
              fontWeight: selected ? 600 : 400,
              color: selected ? '#fff' : '#7a7a6f',
              bgcolor: selected ? colors.accent : 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              '&:hover': selected ? undefined : { color: colors.ink },
            }}
          >
            {option.name}
          </Box>
        );
      })}
    </Box>
  );
}

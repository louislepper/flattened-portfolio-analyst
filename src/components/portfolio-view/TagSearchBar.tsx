import { useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import type { FlattenedAllocation } from '../../domain/types';
import type { ViewMode } from '../../domain/types';

interface TagOption {
  readonly key: string;
  readonly name: string;
}

interface TagSearchBarProps {
  readonly allocations: readonly FlattenedAllocation[];
  readonly viewMode: ViewMode;
  readonly onViewModeChange: (viewMode: ViewMode) => void;
}

export function TagSearchBar({
  allocations,
  viewMode,
  onViewModeChange,
}: TagSearchBarProps) {
  const tagOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: TagOption[] = [];

    for (const allocation of allocations) {
      for (const tag of allocation.tags) {
        if (!seen.has(tag.key)) {
          seen.add(tag.key);
          options.push({ key: tag.key, name: tag.name });
        }
      }
    }

    return options;
  }, [allocations]);

  const selectedOption = viewMode.kind === 'tag'
    ? tagOptions.find((o) => o.key === viewMode.tagKey) ?? null
    : null;

  return (
    <Autocomplete
      options={tagOptions}
      getOptionLabel={(option) => option.name}
      value={selectedOption}
      onChange={(_event, newValue) => {
        if (newValue) {
          onViewModeChange({
            kind: 'tag',
            tagKey: newValue.key,
            tagName: newValue.name,
          });
        } else {
          onViewModeChange({ kind: 'securities' });
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Group by tag"
          size="small"
        />
      )}
      isOptionEqualToValue={(option, value) =>
        option.key === value.key}
      sx={{ minWidth: 250 }}
    />
  );
}

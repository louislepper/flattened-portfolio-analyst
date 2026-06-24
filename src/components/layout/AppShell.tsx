import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import GitHubIcon from '@mui/icons-material/GitHub';
import type { ReactNode } from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';
import { colors, fonts, GITHUB_URL } from '../../theme/tokens';

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { state } = usePortfolio();
  const isFirstScreen = state.phase === 'input';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: colors.pageBg,
        position: 'relative',
      }}
    >
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2.5, md: 4 },
          py: 2,
          bgcolor: colors.headerBg,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Box
          component="h1"
          sx={{
            m: 0,
            fontFamily: fonts.serif,
            fontSize: { xs: 16, md: 18 },
            fontWeight: 600,
            color: colors.inkStrong,
            letterSpacing: '-0.01em',
          }}
        >
          Flattened Portfolio Analyst
        </Box>
        <Stack
          direction="row"
          spacing={3}
          alignItems="center"
          sx={{ fontSize: 13.5, color: colors.inkFaint }}
        >
          <Box
            component="span"
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            How it works
          </Box>
          <Box
            component="span"
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            Methodology
          </Box>
          {isFirstScreen && (
            <Link
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                color: colors.accentDeep,
              }}
            >
              <GitHubIcon sx={{ fontSize: 22 }} />
            </Link>
          )}
        </Stack>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: 1180,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 5 },
        }}
      >
        {children}
      </Box>

      <Box
        component="footer"
        sx={{
          px: { xs: 2.5, md: 4 },
          py: 2,
          textAlign: 'right',
          fontSize: 12,
          color: colors.inkFaint,
          fontStyle: 'italic',
        }}
      >
        Designed with Claude (Obviously) — bite me
      </Box>
    </Box>
  );
}

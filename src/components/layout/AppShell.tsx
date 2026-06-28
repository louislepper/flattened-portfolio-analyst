import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import GitHubIcon from '@mui/icons-material/GitHub';
import type { ReactNode } from 'react';
import { colors, fonts, GITHUB_URL } from '../../theme/tokens';

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {

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
            fontSize: { xs: 15, md: 18 },
            fontWeight: 600,
            color: colors.inkStrong,
            letterSpacing: '-0.01em',
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
            Flattened Portfolio Analyst
          </Box>
          <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
            Flattened Portfolio
          </Box>
        </Box>

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

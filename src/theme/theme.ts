import { createTheme } from '@mui/material/styles';

// Design tokens imported from the "Portfolio shares table" Claude Design
// project. Warm, muted, paper-like palette with a terracotta/clay accent.
export const designColors = {
  pageBackground: '#f4f4f2',
  surface: '#ffffff',
  surfaceMuted: '#faf9f6',
  cardBorder: '#e6e6e1',
  sectionBorder: '#ededea',
  rowBorder: '#f1f1ee',
  textPrimary: '#1a1a18',
  textBody: '#46463f',
  textSecondary: '#8a8a82',
  textMuted: '#a8a89e',
  headerLabel: '#9a9a92',
  accent: '#c7855f',
  accentText: '#7a5536',
  accentTextHover: '#5e3d22',
} as const;

const FONT_FAMILY = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(', ');

const theme = createTheme({
  palette: {
    primary: {
      main: designColors.accentText,
      dark: designColors.accentTextHover,
      light: designColors.accent,
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#a14a32',
    },
    background: {
      default: designColors.pageBackground,
      paper: designColors.surface,
    },
    text: {
      primary: designColors.textPrimary,
      secondary: designColors.textSecondary,
    },
    divider: designColors.cardBorder,
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: FONT_FAMILY,
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: designColors.surface,
          color: designColors.textPrimary,
          boxShadow: 'none',
          borderBottom: `1px solid ${designColors.cardBorder}`,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;

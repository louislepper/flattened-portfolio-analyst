import { createTheme } from '@mui/material/styles';
import { colors, fonts } from './tokens';

const theme = createTheme({
  palette: {
    background: {
      default: colors.pageBg,
      paper: colors.surface,
    },
    primary: {
      main: colors.accent,
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.danger,
    },
    text: {
      primary: colors.ink,
      secondary: colors.inkMuted,
    },
    divider: colors.border,
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: fonts.sans,
    h4: { fontFamily: fonts.serif, fontWeight: 600 },
    h5: { fontFamily: fonts.serif, fontWeight: 600 },
    h6: { fontFamily: fonts.serif, fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 9,
          fontWeight: 600,
        },
        containedPrimary: {
          backgroundColor: colors.accent,
          '&:hover': { backgroundColor: colors.accentDeep },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          backgroundColor: colors.surface,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

export default theme;

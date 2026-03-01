import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import { PortfolioProvider } from './context/PortfolioContext';
import { AppShell } from './components/layout/AppShell';
import { PortfolioInputPanel } from './components/portfolio-input/PortfolioInputPanel';
import { PortfolioView } from './components/portfolio-view/PortfolioView';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { ErrorAlert } from './components/common/ErrorAlert';
import { usePortfolio } from './hooks/usePortfolio';

function PortfolioContent() {
  const { state, reset } = usePortfolio();

  switch (state.phase) {
    case 'input':
      return <PortfolioInputPanel />;
    case 'loading':
      return <LoadingOverlay />;
    case 'results':
      return <PortfolioView />;
    case 'error':
      return (
        <ErrorAlert
          message={state.errorMessage ?? 'An error occurred'}
          onRetry={reset}
        />
      );
  }
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PortfolioProvider>
        <AppShell>
          <PortfolioContent />
        </AppShell>
      </PortfolioProvider>
    </ThemeProvider>
  );
}

export default App;

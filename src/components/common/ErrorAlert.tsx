import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

interface ErrorAlertProps {
  readonly message: string;
  readonly onRetry?: () => void;
}

export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Try Again
          </Button>
        )
      }
    >
      {message}
    </Alert>
  );
}

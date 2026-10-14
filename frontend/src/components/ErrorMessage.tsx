import React from 'react';
import { AlertCircle, X, HelpCircle } from 'lucide-react';

interface ErrorMessageProps {
  error: string | null;
  onDismiss?: () => void;
  className?: string;
  showBackendHint?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onDismiss,
  className = '',
  showBackendHint = false,
}) => {
  if (!error) return null;

  const isNetworkError = error.toLowerCase().includes('connect') || error.toLowerCase().includes('network');

  return (
    <div
      role="alert"
      className={`rounded-lg bg-rose-500/10 border border-rose-500/30 p-3.5 text-rose-200 text-sm flex items-start gap-3 animate-in fade-in duration-200 ${className}`}
    >
      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <div className="font-medium text-rose-300">Request Error</div>
        <div className="text-rose-200/90 leading-relaxed break-words">{error}</div>

        {(showBackendHint || isNetworkError) && (
          <div className="mt-2 text-xs bg-rose-950/40 p-2.5 rounded border border-rose-500/20 text-rose-300/80 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-rose-200">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FastAPI Backend Troubleshooting:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-rose-300/70 pl-1">
              <li>Ensure your backend is running: <code className="text-rose-200 bg-rose-900/40 px-1 rounded">uvicorn main:app --reload --port 8000</code></li>
              <li>Check CORS config on FastAPI to allow requests from the browser origin.</li>
              <li>You can click the backend status badge in the navbar to test connectivity or adjust the URL.</li>
            </ul>
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          type="button"
          aria-label="Dismiss error"
          className="text-rose-400 hover:text-rose-200 p-1 rounded-md hover:bg-rose-500/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

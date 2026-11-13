import React from 'react';
import i18n from '../i18n';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: ''
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected error'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 font-black text-xl">
              !
            </div>
            <h2 className="text-lg font-extrabold text-black">
              {i18n.t('error_boundary_title')}
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              {i18n.t('error_boundary_desc')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-[#007AFF] text-white font-bold text-sm active:opacity-80 transition-opacity"
            >
              {i18n.t('reload_app')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

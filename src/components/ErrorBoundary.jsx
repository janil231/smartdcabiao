import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Log error to monitoring service (when implemented)
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-6">
              <div className="flex justify-center">
                <svg className="h-12 w-12 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-bold text-red-900">Something went wrong</h1>
              <p className="mt-2 text-red-700">
                We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center rounded-lg bg-red-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
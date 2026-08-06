import React from 'react';
import '../pages/ErrorPages.css';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error in React ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page-wrapper">
          <div className="error-card danger-theme">
            <div className="error-hero-glow danger" />
            <div className="error-badge danger">APPLICATION ERROR</div>

            <h1 className="error-title">Ինչ-որ բան սխալ գնաց</h1>
            <p className="error-subtitle">
              Ծրագրում տեղի է ունեցել անսպասելի սխալ: Խնդրում ենք թարմացնել էջը կամ վերադառնալ գլխավոր էջ:
            </p>

            <div className="error-actions">
              <button className="btn-error primary" onClick={() => window.location.reload()}>
                🔄 Թարմացնել Էջը
              </button>
              <button className="btn-error secondary" onClick={() => window.location.href = '/'}>
                🏠 Գլխավոր Էջ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

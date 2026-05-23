import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info?.componentStack);
    // surface to the page so the preview tool can inspect it
    window.__lastReactError = {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.slice(0, 1200),
      componentStack: info?.componentStack?.slice(0, 600),
    };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#FF4444', background: '#0A0E1A', minHeight: '100vh' }}>
          <h1 style={{ marginBottom: 12, fontSize: 20 }}>App crashed</h1>
          <div style={{ fontWeight: 700 }}>{this.state.error?.name}: {this.state.error?.message}</div>
          <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', fontSize: 12, color: '#94A3B8' }}>
            {this.state.error?.stack}
          </pre>
          <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', fontSize: 12, color: '#94A3B8' }}>
            {this.state.info?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

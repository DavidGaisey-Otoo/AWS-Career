import { Component } from 'react';
import { isStaleChunkError, recoverStaleChunk } from '../lib/lazyWithRecovery.js';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, recovering: false };
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
    if (isStaleChunkError(error)) {
      this.setState({ recovering: true });
      recoverStaleChunk(error).then((started) => {
        if (!started) this.setState({ recovering: false });
      }).catch(() => this.setState({ recovering: false }));
    }
  }
  render() {
    if (this.state.error) {
      const staleChunk = isStaleChunkError(this.state.error);
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#FF4444', background: '#0A0E1A', minHeight: '100vh' }}>
          <h1 style={{ marginBottom: 12, fontSize: 20 }}>{staleChunk ? 'Updating the app' : 'App crashed'}</h1>
          {staleChunk && (
            <div style={{ maxWidth: 680, marginBottom: 18, color: '#E2E8F0', lineHeight: 1.6 }}>
              {this.state.recovering
                ? 'A newer release is available. Clearing the obsolete page cache and reloading safely…'
                : 'This page belongs to an older release. Your saved data is safe. Reload the current version to continue.'}
              {!this.state.recovering && (
                <div>
                  <button
                    type="button"
                    onClick={() => recoverStaleChunk(this.state.error).then((started) => { if (!started) window.location.reload(); })}
                    style={{ marginTop: 14, padding: '10px 16px', border: 0, borderRadius: 8, background: '#FF9900', color: '#111827', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Load current version
                  </button>
                </div>
              )}
            </div>
          )}
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

'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  console.error('Global Error:', error);
  return (
    <html>
      <body style={{ padding: 20, fontFamily: 'sans-serif' }}>
        <h1>Application Error</h1>
        <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, overflow: 'auto' }}>
          {error.message}
          {'\n'}
          {error.stack}
        </pre>
        <button onClick={reset} style={{ marginTop: 10, padding: '8px 16px' }}>
          Try again
        </button>
      </body>
    </html>
  );
}

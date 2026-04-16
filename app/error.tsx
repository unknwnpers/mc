'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  console.error('Root Error Boundary:', error);
  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Something broke</h1>
      <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
        {error.message}
        {'\n'}
        {error.stack}
      </pre>
      <button onClick={reset} style={{ marginTop: 10, padding: '8px 16px' }}>
        Try again
      </button>
    </div>
  );
}

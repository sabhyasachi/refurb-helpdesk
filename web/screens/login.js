// LoginScreen — username-only auth. No demo shortcuts in production.

function LoginScreen({ onLogin }) {
  const [username, setUsername] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setError('');
    const uname = username.trim().toLowerCase();
    if (!uname) { setError('Enter your user ID'); return; }
    setBusy(true);
    try {
      const { user } = await API.login(uname);
      onLogin(user);
    } catch (e) {
      setError(e.status === 404 ? 'No account found with that user ID' : `Sign-in failed — ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0F1419 0%, #1F2937 100%)', padding: 20, overflow: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #F59E0B, #DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'white' }}>R</div>
            <div style={{ color: 'white', fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>Refurb Helpdesk</div>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: -0.3, marginBottom: 6 }}>Sign in</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 22 }}>Enter the user ID your admin gave you.</div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>User ID</label>
          <input
            value={username} onChange={e => setUsername(e.target.value)}
            autoFocus placeholder="e.g. rajesh.k" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 16, outline: 'none', fontFamily: 'ui-monospace, SF Mono, Menlo, monospace' }}
          />
          {error && <div style={{ marginTop: 14, padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13 }}>{error}</div>}
          <button onClick={submit} disabled={busy} style={{ marginTop: 18, width: '100%', background: busy ? '#374151' : '#111827', color: 'white', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 600 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Spinny internal · v1</div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;

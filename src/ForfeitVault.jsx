import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// Secret per-person forfeit library. Each player has their own doc
// (forfeitVaults/martin, forfeitVaults/karine), locked behind a 4-digit PIN
// so the other player can't open it just by flipping the Active Logger.
// Note: this hides the list inside the app; it is not encryption.

async function hashPin(person, pin) {
  const data = new TextEncoder().encode(`reps-arena-vault:${person.toLowerCase()}:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ForfeitVault({ db, person, unlockedFor, setUnlockedFor, items, setItems, s }) {
  const color = person === 'Martin' ? '#38bdf8' : '#f472b6';
  const accent = person === 'Martin' ? '#0284c7' : '#db2777';
  const [vault, setVault] = useState(null); // { pinHash, items } or {} when empty
  const [loaded, setLoaded] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [newItem, setNewItem] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const vaultRef = doc(db, 'forfeitVaults', person.toLowerCase());
  const unlocked = unlockedFor === person;

  useEffect(() => {
    setLoaded(false); setPin(''); setPin2(''); setError(''); setConfirmReset(false);
    const unsub = onSnapshot(vaultRef, snap => {
      const d = snap.exists() ? snap.data() : {};
      setVault(d);
      setLoaded(true);
    }, () => { setLoaded(true); setError('Could not reach the cloud. Try again in a moment.'); });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person]);

  // Feed the unlocked items up to the forfeit picker
  useEffect(() => {
    if (unlocked && vault) setItems(vault.items || []);
  }, [unlocked, vault, setItems]);

  const save = async (nextItems) => {
    await setDoc(vaultRef, { items: nextItems }, { merge: true });
  };

  const createPin = async () => {
    if (!/^\d{4}$/.test(pin)) return setError('PIN must be 4 digits.');
    if (pin !== pin2) return setError("PINs don't match.");
    const pinHash = await hashPin(person, pin);
    await setDoc(vaultRef, { pinHash, items: vault?.items || [] }, { merge: true });
    setPin(''); setPin2(''); setError('');
    setUnlockedFor(person);
  };

  const unlock = async () => {
    const h = await hashPin(person, pin);
    if (h === vault.pinHash) { setUnlockedFor(person); setPin(''); setError(''); }
    else { setError('Wrong PIN.'); setPin(''); }
  };

  const lock = () => { setUnlockedFor(null); setItems([]); };

  const resetVault = async () => {
    await setDoc(vaultRef, { pinHash: null, items: [] }, { merge: true });
    setUnlockedFor(null); setItems([]); setConfirmReset(false);
  };

  const addItem = async () => {
    const t = newItem.trim();
    if (!t) return;
    const next = [...(vault.items || []), { id: Date.now(), text: t.slice(0, 200) }];
    setNewItem('');
    await save(next);
  };

  const removeItem = async (id) => save((vault.items || []).filter(i => i.id !== id));
  const saveEdit = async () => {
    const t = editText.trim();
    if (!t) return;
    await save((vault.items || []).map(i => i.id === editId ? { ...i, text: t.slice(0, 200) } : i));
    setEditId(null); setEditText('');
  };

  const pinInput = (val, set, placeholder, onEnter) => (
    <input
      type="password" inputMode="numeric" maxLength={4} placeholder={placeholder}
      value={val} onChange={e => set(e.target.value.replace(/\D/g, ''))}
      onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter(); }}
      style={{ ...s.input, textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem' }}
    />
  );

  return (
    <div style={s.panel}>
      <h3 style={{ marginTop: 0, marginBottom: '4px', fontSize: '1.1rem' }}>🔒 {person}'s Secret Forfeits</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '14px' }}>
        Your private library of forfeits. Only you can open it with your PIN. When you win a week, pick from it in the Weekly Showdown, and only the one you choose gets revealed.
      </p>

      {!loaded && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Connecting…</div>}

      {loaded && !vault?.pinHash && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '260px', margin: '0 auto' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color, textAlign: 'center' }}>Create your 4-digit PIN</div>
          {pinInput(pin, setPin, 'PIN')}
          {pinInput(pin2, setPin2, 'Confirm', createPin)}
          <button onClick={createPin} style={{ ...s.primaryBtn, background: accent }}>Lock my library</button>
        </div>
      )}

      {loaded && vault?.pinHash && !unlocked && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '260px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem' }}>🔐</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color }}>Enter {person}'s PIN</div>
          {pinInput(pin, setPin, '••••', unlock)}
          <button onClick={unlock} style={{ ...s.primaryBtn, background: accent }}>Unlock</button>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer' }}>Forgot PIN?</button>
          ) : (
            <div style={{ fontSize: '0.78rem', color: '#f87171' }}>
              Resetting deletes {person}'s whole list and the PIN.
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '6px' }}>
                <button onClick={resetVault} style={{ ...s.smallBtn, color: '#f87171', borderColor: '#f87171' }}>Reset</button>
                <button onClick={() => setConfirmReset(false)} style={s.smallBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {loaded && vault?.pinHash && unlocked && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text" placeholder="Add a forfeit…" maxLength={200} value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
              style={s.input}
            />
            <button onClick={addItem} style={{ ...s.primaryBtn, background: accent, padding: '8px 14px' }}>Add</button>
          </div>
          {(vault.items || []).length === 0 && (
            <div style={{ fontSize: '0.82rem', color: '#64748b', textAlign: 'center', padding: '10px' }}>Nothing here yet. Add your first one 😏</div>
          )}
          {(vault.items || []).map(i => (
            <div key={i.id} style={{ background: '#000000', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editId === i.id ? (
                <>
                  <input type="text" value={editText} maxLength={200} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); }} style={s.input} />
                  <button onClick={saveEdit} style={{ ...s.smallBtn, color: '#4ade80', borderColor: '#4ade80' }}>Save</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: '0.88rem', color: '#f8fafc' }}>{i.text}</span>
                  <button onClick={() => { setEditId(i.id); setEditText(i.text); }} style={s.smallBtn}>Edit</button>
                  <button onClick={() => removeItem(i.id)} style={{ ...s.smallBtn, color: '#f87171', borderColor: '#f87171' }}>✕</button>
                </>
              )}
            </div>
          ))}
          <button onClick={lock} style={{ ...s.smallBtn, alignSelf: 'center', marginTop: '4px' }}>🔒 Lock</button>
        </div>
      )}

      {error && <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '8px', textAlign: 'center' }}>{error}</div>}
    </div>
  );
}

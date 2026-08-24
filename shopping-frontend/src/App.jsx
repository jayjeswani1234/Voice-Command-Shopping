import { useCallback, useEffect, useState } from 'react';
import { api, getOrCreateUserId } from './api';
import { VoiceBar } from './components/VoiceBar';
import { ShoppingList } from './components/ShoppingList';
import { Recommendations } from './components/Recommendations';
import { ProductSearch } from './components/ProductSearch';
import { BottomNav } from './components/BottomNav';

const POLL_INTERVAL_MS = 6000;
const userId = getOrCreateUserId();

export default function App() {
  const [items, setItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [error, setError] = useState(null);

  const refreshList = useCallback(async () => {
    try {
      const list = await api.getShoppingList(userId);
      setItems(list);
      setError(null);
    } catch (err) {
      setError('Could not reach the shopping service.');
    }
  }, []);

  const refreshRecommendations = useCallback(async () => {
    try {
      const { recommendations: recs } = await api.getRecommendations(userId);
      setRecommendations(recs);
    } catch {
      // recommendations are a nice-to-have -- fail silently rather than
      // blocking the rest of the UI
    }
  }, []);

  useEffect(() => {
    refreshList();
    refreshRecommendations();
    const interval = setInterval(() => {
      refreshList();
      refreshRecommendations();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshList, refreshRecommendations]);

  // Voice/text commands go through Kafka asynchronously -- show an
  // optimistic "pending" row immediately, then reconcile with the server.
  async function handleVoiceSubmit(text) {
    setBusy(true);
    setPendingCount((n) => n + 1);
    try {
      await api.sendCommand(userId, text);
    } catch (err) {
      setError('Could not send that command.');
    } finally {
      setTimeout(async () => {
        await refreshList();
        setPendingCount(0);
        setBusy(false);
      }, 1400);
    }
  }

  async function handleManualAdd(name) {
    try {
      await api.addShoppingItem(userId, name);
      refreshList();
    } catch {
      setError('Could not add that item.');
    }
  }

  async function handleTogglePurchased(item) {
    setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, purchased: !i.purchased } : i)));
    try {
      await api.updateShoppingItem(item._id, { purchased: !item.purchased });
      refreshRecommendations();
    } catch {
      refreshList(); // roll back the optimistic toggle by re-syncing
    }
  }

  async function handleDelete(item) {
    setItems((prev) => prev.filter((i) => i._id !== item._id));
    try {
      await api.deleteShoppingItem(item._id);
    } catch {
      refreshList();
    }
  }

  return (
    <div className="app" data-active-tab={activeTab}>
      <header className="app-header">
        <div className="app-header__row">
          <h1 className="app-header__title">Listy</h1>
          <span className="app-header__tag">voice shopping list</span>
        </div>
        <VoiceBar onSubmit={handleVoiceSubmit} busy={busy} />
      </header>

      <main className="app-main">
        <section className="panel panel-list">
          <ShoppingList
            items={items}
            pendingCount={pendingCount}
            onTogglePurchased={handleTogglePurchased}
            onDelete={handleDelete}
            onManualAdd={handleManualAdd}
          />
          {error && <p style={{ color: 'var(--tomato)', fontSize: 13, marginTop: 10 }}>{error}</p>}
        </section>

        <Recommendations recommendations={recommendations} onAdd={handleManualAdd} />
        <ProductSearch onAdd={handleManualAdd} />
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}

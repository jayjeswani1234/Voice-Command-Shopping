import { useState } from 'react';

function StampIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShoppingList({ items, pendingCount, onTogglePurchased, onDelete, onManualAdd }) {
  const [draft, setDraft] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    onManualAdd(name);
    setDraft('');
  }

  const total = items.length + pendingCount;

  return (
    <div className="receipt">
      <div className="section-heading" style={{ marginBottom: 0 }}>
        <h2 className="receipt__title">My list</h2>
        <span className="receipt__count">{total} item{total === 1 ? '' : 's'}</span>
      </div>
      <hr className="receipt__divider" />

      {items.length === 0 && pendingCount === 0 ? (
        <p className="receipt__empty">Nothing on the list yet — try saying "add milk."</p>
      ) : (
        <ul className="receipt__list">
          {items.map((item) => (
            <li
              key={item._id}
              className="receipt-item"
              data-purchased={item.purchased}
            >
              <button
                className="receipt-item__stamp"
                onClick={() => onTogglePurchased(item)}
                aria-pressed={item.purchased}
                aria-label={item.purchased ? `Mark ${item.name} as not purchased` : `Mark ${item.name} as purchased`}
              >
                <StampIcon />
              </button>
              <span className="receipt-item__name">{item.name}</span>
              {item.quantity > 1 && (
                <span className="receipt-item__qty">
                  ×{item.quantity}
                  {item.unit ? ` ${item.unit}` : ''}
                </span>
              )}
              <button
                className="receipt-item__delete"
                onClick={() => onDelete(item)}
                aria-label={`Remove ${item.name} from list`}
              >
                ×
              </button>
            </li>
          ))}

          {Array.from({ length: pendingCount }).map((_, i) => (
            <li key={`pending-${i}`} className="receipt-item" data-pending="true">
              <span className="receipt-item__stamp" style={{ borderStyle: 'dashed' }} />
              <span className="receipt-item__name">Updating list…</span>
            </li>
          ))}
        </ul>
      )}

      <form className="receipt__add" onSubmit={handleAdd}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an item by hand…"
          aria-label="Add item by name"
        />
        <button type="submit">Add</button>
      </form>

      <p className="receipt__footer">— that's everything —</p>
    </div>
  );
}

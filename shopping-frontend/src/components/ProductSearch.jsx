import { useEffect, useState } from 'react';
import { api } from '../api';

export function ProductSearch({ onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        const products = await api.searchProducts(params.toString());
        setResults(products);
      } catch (err) {
        console.error('Product search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <section className="panel panel-search">
      <div className="section-heading">
        <h2>Browse products</h2>
        {loading && <span className="section-heading__meta">Searching…</span>}
      </div>

      <div className="search-box">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the catalog…"
          aria-label="Search products"
        />
      </div>

      {results.length === 0 && !loading ? (
        <p className="search-empty">No products found{query ? ` for "${query}"` : ''}.</p>
      ) : (
        <div className="product-grid">
          {results.map((product) => (
            <div className="product-card" key={product._id} data-out-of-stock={!product.inStock}>
              <span className="product-card__category">{product.category}</span>
              <p className="product-card__name">{product.name}</p>
              {product.brand && <p className="product-card__brand">{product.brand}</p>}
              <span className="product-card__price">${Number(product.price).toFixed(2)}</span>
              <button
                className="product-card__add"
                onClick={() => onAdd(product.name)}
                disabled={!product.inStock}
              >
                {product.inStock ? 'Add to list' : 'Out of stock'}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

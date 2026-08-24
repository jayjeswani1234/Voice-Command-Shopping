export function Recommendations({ recommendations, onAdd }) {
  return (
    <section className="panel panel-recs">
      <div className="section-heading">
        <h2>Recommended for you</h2>
      </div>
      {recommendations.length === 0 ? (
        <p className="recs-empty">Check off a few purchases and recommendations will show up here.</p>
      ) : (
        <div className="recs-row">
          {recommendations.map((rec) => (
            <div className="rec-card" key={rec.product}>
              <p className="rec-card__name">{rec.product}</p>
              <p className="rec-card__meta">
                bought {rec.timesPurchased}×
              </p>
              <button className="rec-card__add" onClick={() => onAdd(rec.product)}>
                Add again
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

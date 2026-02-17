interface MarketsListProps {
  markets: any[];
  onEdit: (market: any) => void;
  onDelete: (id: string) => void;
}

export function MarketsList({ markets, onEdit, onDelete }: MarketsListProps) {
  if (markets.length === 0) {
    return (
      <div className="text-center py-8 text-ash-400">
        <p>No markets added yet.</p>
        <p className="text-sm mt-1">Add your first market to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {markets.map((market) => (
        <div key={market.id} className="card p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display text-lg">{market.name}</h3>
          </div>

          <div className="space-y-1 text-sm">
            {market.cities && (
              <p className="text-ash-300">
                <span className="text-ash-500">Cities:</span> {market.cities}
              </p>
            )}
            {market.area_codes && (
              <p className="text-ash-300">
                <span className="text-ash-500">Area Codes:</span> {market.area_codes}
              </p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onEdit(market)}
              className="btn-secondary text-sm flex-1"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(market.id)}
              className="btn-ghost text-sm text-danger flex-1"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

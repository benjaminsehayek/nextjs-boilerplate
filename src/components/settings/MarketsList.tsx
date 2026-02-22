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
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-medium">{market.name}</h3>
              {market.is_primary && (
                <span className="text-xs text-flame-400 font-medium">Primary</span>
              )}
            </div>
          </div>

          <div className="space-y-1 text-xs text-ash-500">
            {market.address && <p>{market.address}</p>}
            {market.phone && <p>{market.phone}</p>}
            {market.area_codes?.length > 0 && (
              <p>Area codes: {market.area_codes.join(', ')}</p>
            )}
            {market.latitude && market.longitude && (
              <p className="font-mono">
                {Number(market.latitude).toFixed(4)}, {Number(market.longitude).toFixed(4)}
              </p>
            )}
            {market.place_id && (
              <p className="truncate font-mono text-ash-700">{market.place_id}</p>
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

interface ServicesListProps {
  services: any[];
  onEdit: (service: any) => void;
  onDelete: (id: string) => void;
}

export function ServicesList({ services, onEdit, onDelete }: ServicesListProps) {
  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-ash-400">
        <p>No services added yet.</p>
        <p className="text-sm mt-1">Add your first service to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => (
        <div key={service.id} className="card p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display text-lg">{service.name}</h3>
          </div>

          <div className="space-y-1 text-sm">
            {service.profit_per_job && (
              <p className="text-ash-300">
                <span className="text-ash-500">Profit:</span> ${service.profit_per_job.toLocaleString()}
              </p>
            )}
            {service.close_rate && (
              <p className="text-ash-300">
                <span className="text-ash-500">Close Rate:</span> {service.close_rate}%
              </p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onEdit(service)}
              className="btn-secondary text-sm flex-1"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(service.id)}
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

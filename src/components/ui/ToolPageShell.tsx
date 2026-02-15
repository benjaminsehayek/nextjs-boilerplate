interface ToolPageShellProps {
  icon: string;
  name: string;
  description: string;
  children: React.ReactNode;
}

export function ToolPageShell({ icon, name, description, children }: ToolPageShellProps) {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{icon}</span>
          <h1 className="text-3xl font-display text-flame-500">{name}</h1>
        </div>
        <p className="text-ash-300">{description}</p>
      </div>

      {children}
    </div>
  );
}

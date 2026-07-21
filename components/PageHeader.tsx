const bgClass: Record<string, string> = {
  wisata: "bg-wisata",
  kuliner: "bg-kuliner",
  penginapan: "bg-penginapan",
  acara: "bg-acara",
};

interface PageHeaderProps {
  title: string;
  color?: "wisata" | "kuliner" | "penginapan" | "acara";
  icon?: string;
}

export default function PageHeader({ title, color = "wisata", icon }: PageHeaderProps) {
  return (
    <div className={`mb-6 text-white ${bgClass[color]}`}>
      <div className="mx-auto max-w-5xl px-4 py-6 text-center sm:px-6">
        {icon && <div className="mb-2 text-3xl">{icon}</div>}
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  color?: "blue" | "orange" | "rose" | "indigo";
  icon?: string;
}

const bgMap: Record<string, string> = {
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  indigo: "bg-indigo-500",
};

export default function PageHeader({ title, color = "blue", icon }: PageHeaderProps) {
  const bg = bgMap[color] ?? bgMap.blue;

  return (
    <div className={`mb-6 ${bg} text-white`}>
      <div className="mx-auto max-w-5xl px-4 py-6 text-center sm:px-6">
        {icon && <div className="mb-2 text-3xl">{icon}</div>}
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      </div>
    </div>
  );
}

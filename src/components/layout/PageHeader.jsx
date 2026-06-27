export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-b border-zinc-200 bg-white sticky top-0 z-10">
      <div className="min-w-0">
        <h1 className="text-base md:text-xl font-semibold text-zinc-900 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-zinc-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0 ml-3">{action}</div>
      )}
    </div>
  );
}

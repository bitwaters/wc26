export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-apple-secondary-bg rounded-apple-md" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-apple-secondary-bg rounded-apple-xl" />
        ))}
      </div>
      <div className="h-64 bg-apple-secondary-bg rounded-apple-xl" />
    </div>
  );
}

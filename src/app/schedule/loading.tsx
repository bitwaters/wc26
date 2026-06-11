export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-9 w-28 bg-apple-secondary-bg rounded-full" />
        ))}
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-48 bg-apple-secondary-bg rounded-apple-xl" />
      ))}
    </div>
  );
}

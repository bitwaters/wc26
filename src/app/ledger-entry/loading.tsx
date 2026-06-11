export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-40 bg-apple-secondary-bg rounded-apple-md mb-4" />
      <div className="flex gap-2 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-16 bg-apple-secondary-bg rounded-full" />
        ))}
      </div>
      <div className="h-12 bg-apple-secondary-bg rounded-apple-xl" />
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-16 bg-apple-secondary-bg rounded-apple-xl" />
      ))}
    </div>
  );
}

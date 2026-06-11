export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-36 bg-apple-secondary-bg rounded-apple-md mb-4" />
      <div className="h-12 bg-apple-secondary-bg rounded-apple-xl" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-20 bg-apple-secondary-bg rounded-apple-xl" />
      ))}
    </div>
  );
}

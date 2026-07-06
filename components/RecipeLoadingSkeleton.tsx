interface RecipeLoadingSkeletonProps {
  count?: number;
}

export default function RecipeLoadingSkeleton({ count = 3 }: RecipeLoadingSkeletonProps) {
  return (
    <div aria-live="polite" aria-busy="true" className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-2.5 text-sm text-fg-muted">
        <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-forest-600" />
        Finding recipes based on what you have.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-border-soft p-4"
          >
            <div className="h-4 w-[60%] animate-pulse rounded bg-surface-sunken" />
            <div className="h-3 w-[40%] animate-pulse rounded bg-surface-sunken" />
            <div className="flex gap-1.5">
              <div className="h-6 w-16 animate-pulse rounded-full bg-surface-sunken" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-surface-sunken" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

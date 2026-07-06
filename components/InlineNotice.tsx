"use client";

interface InlineNoticeProps {
  variant: "neutral" | "error";
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

export default function InlineNotice({ variant, children, action }: InlineNoticeProps) {
  const isError = variant === "error";

  return (
    <div
      role={isError ? "alert" : undefined}
      className={`flex items-start gap-2.5 rounded p-3.5 ${
        isError ? "bg-red-50" : "bg-surface-sunken"
      }`}
    >
      {isError ? (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
          aria-hidden="true"
        >
          <path
            d="M10 2 1 17h18L10 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M10 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="14.5" r="0.9" fill="currentColor" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="mt-0.5 h-4 w-4 shrink-0 text-forest-600"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 9v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="6.5" r="0.9" fill="currentColor" />
        </svg>
      )}
      <div className="flex flex-col items-start gap-1.5">
        <p className="text-sm text-fg">{children}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={`text-sm font-semibold ${isError ? "text-red-600" : "text-forest-700"}`}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

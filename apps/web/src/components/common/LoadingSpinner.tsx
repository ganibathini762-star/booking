import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
  fullScreen?: boolean;
};

export function LoadingSpinner({ size = "md", className, fullScreen }: Props) {
  const sizeClass = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-4",
  }[size];

  const spinner = (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClass,
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" />
    </div>
  );
}

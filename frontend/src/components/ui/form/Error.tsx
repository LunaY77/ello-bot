/**
 * Error Component
 * V1 Design System Updated
 */
export type ErrorProps = {
  errorMessage?: string | null;
};

export const Error = ({ errorMessage }: ErrorProps) => {
  if (!errorMessage) return null;

  return (
    <div
      role="alert"
      aria-label={errorMessage}
      className="text-sm font-semibold text-danger"
    >
      {errorMessage}
    </div>
  );
};

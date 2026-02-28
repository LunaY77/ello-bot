/**
 * Error Component
 *
 * Description:
 * Displays error messages for form fields.
 *
 * Features:
 * - Accessibility support (role="alert")
 * - Conditional rendering (not rendered when no error)
 */

/**
 * Error Component Props Type
 */
export type ErrorProps = {
  /** Error message */
  errorMessage?: string | null;
};

/**
 * Error Component
 *
 * @param errorMessage - Error message, not rendered when empty
 *
 * @example
 * <Error errorMessage="Please enter a valid email address" />
 */
export const Error = ({ errorMessage }: ErrorProps) => {
  if (!errorMessage) return null;

  return (
    <div
      role="alert"
      aria-label={errorMessage}
      className="text-sm font-semibold text-red-500"
    >
      {errorMessage}
    </div>
  );
};

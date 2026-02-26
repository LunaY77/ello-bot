/**
 * Head SEO Component
 *
 * Functionality:
 * Uses react-helmet-async to manage page head tags,
 * including title, description and other SEO-related meta information.
 *
 * Features:
 * - Dynamic page title setting
 * - Support for custom descriptions
 * - Automatic app name suffix addition
 */

import { Helmet, HelmetData } from 'react-helmet-async';

/**
 * Props type for Head component
 */
type HeadProps = {
  /** Page title */
  title?: string;
  /** Page description */
  description?: string;
};

/**
 * HelmetData instance
 * Used for data collection during server-side rendering
 */
const helmetData = new HelmetData({});

/**
 * Head SEO Component
 *
 * @param title - Page title, automatically appended with app name suffix
 * @param description - Page description, used for SEO
 *
 * @example
 * <Head title="Login" description="User login page" />
 * // Rendered result: <title>Login | ello</title>
 */
export const Head = ({ title = '', description = '' }: HeadProps = {}) => {
  return (
    <Helmet
      helmetData={helmetData}
      title={title ? `${title} | Ello` : undefined}
      defaultTitle="Ello"
    >
      <meta name="description" content={description} />
    </Helmet>
  );
};

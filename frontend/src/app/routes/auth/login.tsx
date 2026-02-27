import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { AuthLayout } from '@/components/layouts/auth-layout';
import { paths } from '@/config/paths';
import { LoginForm } from '@/features/auth/components/login-form';

const LoginRoute = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  return (
    <AuthLayout title={t('login.title')}>
      <LoginForm
        onSuccess={() => {
          navigate(
            `${redirectTo ? `${redirectTo}` : paths.app.dashboard.getHref()}`,
            { replace: true },
          );
        }}
      />
    </AuthLayout>
  );
};

export default LoginRoute;

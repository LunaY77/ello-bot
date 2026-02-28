import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { AuthLayout } from '@/components/layouts/AuthLayout';
import { paths } from '@/config/paths';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

const RegisterRoute = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  return (
    <AuthLayout title={t('register.title')}>
      <RegisterForm
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

export default RegisterRoute;

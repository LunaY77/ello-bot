import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { LoginRequestSchema } from '@/api/schemas';
import { Button } from '@/components/ui/button';
import { Form, Input } from '@/components/ui/form';
import { paths } from '@/config/paths';
import { useLogin } from '@/lib/auth';

type LoginFormProps = {
  onSuccess: () => void;
};

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const login = useLogin({
    onSuccess,
  });

  return (
    <div>
      <Form
        onSubmit={(values) => {
          login.mutate(values);
        }}
        schema={LoginRequestSchema}
      >
        {({ register, formState }) => (
          <>
            <Input
              type="text"
              label={t('login.username')}
              error={formState.errors.username}
              registration={register('username')}
              placeholder={t('login.usernamePlaceholder')}
              autoComplete="username"
              className="h-11 rounded-2xl border-stone-300 bg-white"
            />
            <Input
              type="password"
              label={t('login.password')}
              error={formState.errors.password}
              registration={register('password')}
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
              className="h-11 rounded-2xl border-stone-300 bg-white"
            />
            <div className="mt-6">
              <Button
                type="submit"
                className="h-11 w-full rounded-2xl"
                isLoading={login.isPending}
              >
                {t('login.submit')}
              </Button>
            </div>
          </>
        )}
      </Form>
      <div className="mt-4 text-center text-sm text-gray-600">
        {t('login.noAccount')}{' '}
        <Link
          to={paths.auth.register.getHref(redirectTo)}
          className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:text-stone-700"
        >
          {t('login.register')}
        </Link>
      </div>
    </div>
  );
};

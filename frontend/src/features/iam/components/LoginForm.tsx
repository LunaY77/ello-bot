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
    <div className="space-y-5">
      <Form
        onSubmit={(values) => {
          login.mutate(values);
        }}
        schema={LoginRequestSchema}
      >
        {({ register, formState }) => (
          <div className="space-y-5">
            <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-2 p-4 sm:p-5">
              <Input
                type="text"
                label={t('login.username')}
                error={formState.errors.username}
                registration={register('username')}
                placeholder={t('login.usernamePlaceholder')}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="h-12 rounded-md border-border-default bg-surface-1 shadow-none focus-visible:ring-4 focus-visible:ring-accent/12"
              />
              <Input
                type="password"
                label={t('login.password')}
                error={formState.errors.password}
                registration={register('password')}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                className="h-12 rounded-md border-border-default bg-surface-1 shadow-none focus-visible:ring-4 focus-visible:ring-accent/12"
              />
            </div>
            <div className="mt-6">
              <Button
                type="submit"
                className="h-11 w-full rounded-md"
                isLoading={login.isPending}
              >
                {t('login.submit')}
              </Button>
            </div>
          </div>
        )}
      </Form>
      <div className="text-center text-body-s text-tertiary">
        {t('login.noAccount')}{' '}
        <Link
          to={paths.auth.register.getHref(redirectTo)}
          className="font-medium text-accent-soft-text underline decoration-accent-soft-border underline-offset-4 transition-colors hover:text-primary"
        >
          {t('login.register')}
        </Link>
      </div>
    </div>
  );
};

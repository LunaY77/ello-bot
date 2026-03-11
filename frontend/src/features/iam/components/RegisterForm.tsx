import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { RegisterRequestSchema } from '@/api/schemas';
import { Button } from '@/components/ui/button';
import { Form, Input } from '@/components/ui/form';
import { Link } from '@/components/ui/link';
import { paths } from '@/config/paths';
import { useRegister } from '@/lib/auth';

type RegisterFormProps = {
  onSuccess: () => void;
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const register = useRegister({ onSuccess });

  const registerFormSchema = RegisterRequestSchema.extend({
    confirmPassword: RegisterRequestSchema.shape.password,
  }).refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: t('register.passwordMismatch'),
  });

  return (
    <div className="space-y-5">
      <Form
        onSubmit={(values) => {
          register.mutate({
            username: values.username,
            password: values.password,
            displayName: values.displayName?.trim() || null,
          });
        }}
        schema={registerFormSchema}
        options={{
          shouldUnregister: true,
        }}
      >
        {({ register: formRegister, formState }) => (
          <div className="space-y-5">
            <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-2 p-4 sm:p-5">
              <Input
                type="text"
                label={t('register.displayName')}
                error={formState.errors.displayName}
                registration={formRegister('displayName')}
                placeholder={t('register.displayNamePlaceholder')}
                autoComplete="nickname"
                className="h-12 rounded-md border-border-default bg-surface-1 shadow-none focus-visible:ring-4 focus-visible:ring-accent/12"
              />
              <Input
                type="text"
                label={t('register.username')}
                error={formState.errors.username}
                registration={formRegister('username')}
                placeholder={t('register.usernamePlaceholder')}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="h-12 rounded-md border-border-default bg-surface-1 shadow-none focus-visible:ring-4 focus-visible:ring-accent/12"
              />
              <Input
                type="password"
                label={t('register.password')}
                error={formState.errors.password}
                registration={formRegister('password')}
                placeholder={t('register.passwordPlaceholder')}
                autoComplete="new-password"
                className="h-12 rounded-md border-border-default bg-surface-1 shadow-none focus-visible:ring-4 focus-visible:ring-accent/12"
              />
              <Input
                type="password"
                label={t('register.confirmPassword')}
                error={formState.errors.confirmPassword}
                registration={formRegister('confirmPassword')}
                placeholder={t('register.confirmPasswordPlaceholder')}
                autoComplete="new-password"
                className="h-12 rounded-md border-border-default bg-surface-1 shadow-none focus-visible:ring-4 focus-visible:ring-accent/12"
              />
            </div>
            <div className="mt-6">
              <Button
                type="submit"
                className="h-11 w-full rounded-md"
                isLoading={register.isPending}
              >
                {t('register.submit')}
              </Button>
            </div>
          </div>
        )}
      </Form>
      <div className="text-center text-body-s text-tertiary">
        {t('register.hasAccount')}{' '}
        <Link
          to={paths.auth.login.getHref(redirectTo)}
          className="font-medium text-accent-soft-text underline decoration-accent-soft-border underline-offset-4 transition-colors hover:text-primary"
        >
          {t('register.login')}
        </Link>
      </div>
    </div>
  );
};

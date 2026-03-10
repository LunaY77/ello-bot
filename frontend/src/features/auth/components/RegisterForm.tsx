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
    <div>
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
          <>
            <Input
              type="text"
              label={t('register.displayName')}
              error={formState.errors.displayName}
              registration={formRegister('displayName')}
              placeholder={t('register.displayNamePlaceholder')}
              autoComplete="nickname"
              className="h-11 rounded-2xl border-stone-300 bg-white"
            />
            <Input
              type="text"
              label={t('register.username')}
              error={formState.errors.username}
              registration={formRegister('username')}
              placeholder={t('register.usernamePlaceholder')}
              autoComplete="username"
              className="h-11 rounded-2xl border-stone-300 bg-white"
            />
            <Input
              type="password"
              label={t('register.password')}
              error={formState.errors.password}
              registration={formRegister('password')}
              placeholder={t('register.passwordPlaceholder')}
              autoComplete="new-password"
              className="h-11 rounded-2xl border-stone-300 bg-white"
            />
            <Input
              type="password"
              label={t('register.confirmPassword')}
              error={formState.errors.confirmPassword}
              registration={formRegister('confirmPassword')}
              placeholder={t('register.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              className="h-11 rounded-2xl border-stone-300 bg-white"
            />
            <div className="mt-6">
              <Button
                type="submit"
                className="h-11 w-full rounded-2xl"
                isLoading={register.isPending}
              >
                {t('register.submit')}
              </Button>
            </div>
          </>
        )}
      </Form>
      <div className="mt-4 text-center text-sm text-gray-600">
        {t('register.hasAccount')}{' '}
        <Link
          to={paths.auth.login.getHref(redirectTo)}
          className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:text-stone-700"
        >
          {t('register.login')}
        </Link>
      </div>
    </div>
  );
};

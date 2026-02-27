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
              label={t('register.username')}
              error={formState.errors.username}
              registration={formRegister('username')}
            />
            <Input
              type="password"
              label={t('register.password')}
              error={formState.errors.password}
              registration={formRegister('password')}
            />
            <Input
              type="password"
              label={t('register.confirmPassword')}
              error={formState.errors.confirmPassword}
              registration={formRegister('confirmPassword')}
            />
            <div className="mt-6">
              <Button
                type="submit"
                className="w-full"
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
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          {t('register.login')}
        </Link>
      </div>
    </div>
  );
};

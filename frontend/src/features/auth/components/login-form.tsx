import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

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
            />
            <Input
              type="password"
              label={t('login.password')}
              error={formState.errors.password}
              registration={register('password')}
            />
            <div className="mt-6">
              <Button
                type="submit"
                className="w-full"
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
          to={paths.auth.register.getHref()}
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          {t('login.registerLink')}
        </Link>
      </div>
    </div>
  );
};

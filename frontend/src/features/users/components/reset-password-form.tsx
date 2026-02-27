import { useTranslation } from 'react-i18next';

import { useResetPassword } from '../api/reset-password';

import { ResetPasswordRequestSchema } from '@/api/schemas';
import { Button } from '@/components/ui/button';
import { Form, Input } from '@/components/ui/form';

type ResetPasswordFormProps = {
  onSuccess?: () => void;
};

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSuccess,
}) => {
  const { t } = useTranslation('user');
  const resetPasswordMutation = useResetPassword({
    mutationConfig: {
      onSuccess: onSuccess,
    },
  });

  const resetPasswordSchema = ResetPasswordRequestSchema.extend({
    confirmPassword: ResetPasswordRequestSchema.shape.newPassword,
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('resetPassword.mismatch'),
    path: ['confirmPassword'],
  });

  return (
    <Form
      onSubmit={(values) => {
        resetPasswordMutation.mutate({ newPassword: values.newPassword });
      }}
      schema={resetPasswordSchema}
    >
      {({ register, formState }) => (
        <>
          <Input
            type="password"
            label={t('resetPassword.newPassword')}
            error={formState.errors.newPassword}
            registration={register('newPassword')}
          />
          <Input
            type="password"
            label={t('resetPassword.confirmPassword')}
            error={formState.errors.confirmPassword}
            registration={register('confirmPassword')}
          />
          <div className="mt-6">
            <Button
              type="submit"
              className="w-full"
              isLoading={resetPasswordMutation.isPending}
            >
              {t('resetPassword.submit')}
            </Button>
          </div>
        </>
      )}
    </Form>
  );
};

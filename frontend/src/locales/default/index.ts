import auth from './auth';
import common from './common';
import error from './error';
import user from './user';
import validation from './validation';

const resources = {
  auth,
  common,
  error,
  user,
  validation,
} as const;

export default resources;

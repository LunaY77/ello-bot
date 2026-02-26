import auth from './auth';
import chat from './chat';
import common from './common';
import error from './error';
import user from './user';
import validation from './validation';

const resources = {
  auth,
  chat,
  common,
  error,
  user,
  validation,
} as const;

export default resources;

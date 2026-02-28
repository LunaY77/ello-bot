import { AppProvider } from './AppProvider';
import { AppRouter } from './AppRouter';

export const App = () => {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
};

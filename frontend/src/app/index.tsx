import * as React from 'react';
import '@patternfly/react-core/dist/styles/base.css';
import '@patternfly/chatbot/dist/css/main.css';
import {BrowserRouter as Router} from 'react-router-dom';
import {AppLayout} from '@app/AppLayout/AppLayout';
import {AppRoutes} from '@app/routes';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {OpenAPI} from 'src/openapi/requests';


export const useGetApiServerBaseUrl = (): string => {
  return 'http://127.0.0.1:8000'
};

const App: React.FunctionComponent = () => {
  OpenAPI.BASE = useGetApiServerBaseUrl();
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

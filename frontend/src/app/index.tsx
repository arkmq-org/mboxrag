import * as React from 'react';
import '@patternfly/react-core/dist/styles/base.css';
import '@patternfly/chatbot/dist/css/main.css';
import {BrowserRouter as Router} from 'react-router-dom';
import {AppLayout} from '@app/AppLayout/AppLayout';
import {AppRoutes} from '@app/routes';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {OpenAPI} from 'src/openapi/requests';


const App: React.FunctionComponent = () => {
  OpenAPI.BASE = 'http://localhost:9000'
  if (window.location.hostname.includes("frontend")){
    OpenAPI.BASE = 'http://'+window.location.hostname.replaceAll("frontend", "server")
  }
  if (process.env.MBOX_RAG_SERVER_URL) {
    OpenAPI.BASE = process.env.MBOX_RAG_SERVER_URL
  }
  console.log("Mbox rag server URL: ", OpenAPI.BASE)
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

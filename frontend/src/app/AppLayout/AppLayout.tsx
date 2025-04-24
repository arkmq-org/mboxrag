import * as React from 'react';
import {
  Page,
} from '@patternfly/react-core';

interface IAppLayout {
  children: React.ReactNode;
}

const AppLayout: React.FunctionComponent<IAppLayout> = ({ children }) => {
  const pageId = 'primary-app-container';
  return (
    <Page
      mainContainerId={pageId}
      isContentFilled
    >
      {children}
    </Page>
  );
};

export { AppLayout };

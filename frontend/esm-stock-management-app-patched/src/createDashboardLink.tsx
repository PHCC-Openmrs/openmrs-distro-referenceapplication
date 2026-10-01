import React, { useMemo } from 'react';
import { ConfigurableLink, useSession, userHasAccess } from '@openmrs/esm-framework';
import { BrowserRouter, useLocation } from 'react-router-dom';

export interface DashboardLinkConfig {
  name: string;
  title: string;
  privilege?: string;
}

function DashboardExtension({ dashboardLinkConfig }: { dashboardLinkConfig: DashboardLinkConfig }) {
  const { name, title, privilege } = dashboardLinkConfig;
  const location = useLocation();
  const session = useSession();
  const spaBasePath = `${window.spaBase}/stock-management`;
  const hasAccess = userHasAccess(privilege, session?.user);

  const navLink = useMemo(() => {
    const pathArray = location.pathname.split('/');
    const lastElement = pathArray[pathArray.length - 1];
    return decodeURIComponent(lastElement);
  }, [location.pathname]);

  if (!hasAccess) {
    return null;
  }

  return (
    <ConfigurableLink
      to={`${spaBasePath}/${name}`}
      className={`cds--side-nav__link ${navLink.match(name) && 'active-left-nav-link'}`}
    >
      {title}
    </ConfigurableLink>
  );
}

export const createDashboardLink = (dashboardLinkConfig: DashboardLinkConfig) => () =>
  (
    <BrowserRouter>
      <DashboardExtension dashboardLinkConfig={dashboardLinkConfig} />
    </BrowserRouter>
  );

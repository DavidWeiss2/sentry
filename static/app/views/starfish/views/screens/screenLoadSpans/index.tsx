import styled from '@emotion/styled';
import {LocationDescriptor} from 'history';
import omit from 'lodash/omit';

import Breadcrumbs, {Crumb} from 'sentry/components/breadcrumbs';
import * as Layout from 'sentry/components/layouts/thirds';
import {DatePageFilter} from 'sentry/components/organizations/datePageFilter';
import PageFilterBar from 'sentry/components/organizations/pageFilterBar';
import SentryDocumentTitle from 'sentry/components/sentryDocumentTitle';
import {t} from 'sentry/locale';
import {space} from 'sentry/styles/space';
import {
  PageErrorAlert,
  PageErrorProvider,
} from 'sentry/utils/performance/contexts/pageError';
import {decodeScalar} from 'sentry/utils/queryString';
import {useLocation} from 'sentry/utils/useLocation';
import useOrganization from 'sentry/utils/useOrganization';
import useRouter from 'sentry/utils/useRouter';
import {ReleaseComparisonSelector} from 'sentry/views/starfish/components/releaseSelector';
import {StarfishPageFiltersContainer} from 'sentry/views/starfish/components/starfishPageFiltersContainer';
import {SpanMetricsField} from 'sentry/views/starfish/types';
import {QueryParameterNames} from 'sentry/views/starfish/views/queryParameters';
import {
  ScreenCharts,
  YAxis,
} from 'sentry/views/starfish/views/screens/screenLoadSpans/charts';
import {ScreenMetricsRibbon} from 'sentry/views/starfish/views/screens/screenLoadSpans/metricsRibbon';
import {ScreenLoadSpanSamples} from 'sentry/views/starfish/views/screens/screenLoadSpans/samples';
import {ScreenLoadSpansTable} from 'sentry/views/starfish/views/screens/screenLoadSpans/table';

type Query = {
  primaryRelease: string;
  project: string;
  secondaryRelease: string;
  spanGroup: string;
  transaction: string;
  [QueryParameterNames.SPANS_SORT]: string;
  spanDescription?: string;
};

function ScreenLoadSpans() {
  const location = useLocation<Query>();
  const organization = useOrganization();
  const router = useRouter();

  const screenLoadModule: LocationDescriptor = {
    pathname: `/organizations/${organization.slug}/performance/mobile/screens/`,
    query: {
      ...omit(location.query, [
        QueryParameterNames.SPANS_SORT,
        'transaction',
        SpanMetricsField.SPAN_OP,
      ]),
    },
  };

  const crumbs: Crumb[] = [
    {
      to: screenLoadModule,
      label: t('Screens'),
      preservePageFilters: true,
    },
    {
      to: '',
      label: decodeScalar(location.query.transaction),
    },
  ];

  const {
    spanGroup,
    primaryRelease,
    secondaryRelease,
    transaction: transactionName,
    spanDescription,
  } = location.query;

  return (
    <SentryDocumentTitle title={transactionName} orgSlug={organization.slug}>
      <Layout.Page>
        <PageErrorProvider>
          <Layout.Header>
            <Layout.HeaderContent>
              <Breadcrumbs crumbs={crumbs} />
              <Layout.Title>{transactionName}</Layout.Title>
            </Layout.HeaderContent>
          </Layout.Header>
          <Layout.Body>
            <Layout.Main fullWidth>
              <PageErrorAlert />
              <StarfishPageFiltersContainer>
                <Container>
                  <FilterContainer>
                    <PageFilterBar condensed>
                      <DatePageFilter />
                    </PageFilterBar>
                    <ReleaseComparisonSelector />
                  </FilterContainer>
                  <ScreenMetricsRibbon />
                </Container>
              </StarfishPageFiltersContainer>
              <ScreenCharts
                yAxes={[YAxis.TTID, YAxis.TTFD]}
                additionalFilters={[`transaction:${transactionName}`]}
                chartHeight={120}
              />
              <ScreenLoadSpansTable
                transaction={transactionName}
                primaryRelease={primaryRelease}
                secondaryRelease={secondaryRelease}
              />
              {spanGroup && (
                <ScreenLoadSpanSamples
                  groupId={spanGroup}
                  transactionName={transactionName}
                  spanDescription={spanDescription}
                  onClose={() => {
                    router.replace({
                      pathname: router.location.pathname,
                      query: omit(
                        router.location.query,
                        'spanGroup',
                        'transactionMethod'
                      ),
                    });
                  }}
                />
              )}
            </Layout.Main>
          </Layout.Body>
        </PageErrorProvider>
      </Layout.Page>
    </SentryDocumentTitle>
  );
}

export default ScreenLoadSpans;

const Container = styled('div')`
  display: grid;
  grid-template-rows: 1fr 1fr;
  grid-template-columns: 1fr;
  column-gap: ${space(2)};

  @media (min-width: ${p => p.theme.breakpoints.large}) {
    grid-template-rows: auto;
    grid-template-columns: auto minmax(100px, max-content);
  }
`;

const FilterContainer = styled('div')`
  display: grid;
  column-gap: ${space(1)};
  grid-template-rows: auto;
  grid-template-columns: auto 1fr;
`;

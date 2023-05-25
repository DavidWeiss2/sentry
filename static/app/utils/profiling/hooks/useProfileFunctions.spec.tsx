import {ReactElement, useMemo} from 'react';

import {initializeOrg} from 'sentry-test/initializeOrg';
import {reactHooks} from 'sentry-test/reactTestingLibrary';

import {useProfileFunctions} from 'sentry/utils/profiling/hooks/useProfileFunctions';
import {QueryClient, QueryClientProvider} from 'sentry/utils/queryClient';
import {OrganizationContext} from 'sentry/views/organizationContext';

function TestContext({children}: {children: ReactElement}) {
  const {organization} = useMemo(() => initializeOrg(), []);
  // ensure client is rebuilt on each render otherwise caching will interfere with subsequent tests
  const client = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={client}>
      <OrganizationContext.Provider value={organization}>
        {children}
      </OrganizationContext.Provider>
    </QueryClientProvider>
  );
}

describe('useProfileFunctions', function () {
  afterEach(function () {
    MockApiClient.clearMockResponses();
  });

  it('initializes with the loading state', function () {
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events/',
      body: {data: []},
    });

    const hook = reactHooks.renderHook(
      () =>
        useProfileFunctions({
          fields: ['count()'],
          referrer: '',
          sort: {
            key: 'count()',
            order: 'desc',
          },
        }),
      {wrapper: TestContext}
    );
    expect(hook.result.current).toMatchObject(
      expect.objectContaining({
        isInitialLoading: true,
      })
    );
  });

  it('fetches functions', async function () {
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events/',
      body: {data: []},
    });

    const hook = reactHooks.renderHook(
      () =>
        useProfileFunctions({
          fields: ['count()'],
          referrer: '',
          sort: {
            key: 'count()',
            order: 'desc',
          },
        }),
      {wrapper: TestContext}
    );
    expect(hook.result.current.isLoading).toEqual(true);
    expect(hook.result.current.isFetched).toEqual(false);
    await hook.waitForNextUpdate();
    expect(hook.result.current).toMatchObject(
      expect.objectContaining({
        isLoading: false,
        isFetched: true,
        data: expect.objectContaining({
          data: expect.any(Array),
        }),
      })
    );
  });
});

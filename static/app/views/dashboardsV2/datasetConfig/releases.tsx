import omit from 'lodash/omit';

import {t} from 'sentry/locale';
import {
  MetricsApiResponse,
  Organization,
  SessionApiResponse,
  SessionField,
} from 'sentry/types';
import {Series} from 'sentry/types/echarts';
import {defined} from 'sentry/utils';
import {TableData} from 'sentry/utils/discover/discoverQuery';
import {getFieldRenderer} from 'sentry/utils/discover/fieldRenderers';
import {FieldValueOption} from 'sentry/views/eventsV2/table/queryField';
import {FieldValueKind} from 'sentry/views/eventsV2/table/types';

import {DisplayType, WidgetQuery} from '../types';
import {
  DERIVED_STATUS_METRICS_PATTERN,
  generateReleaseWidgetFieldOptions,
  SESSIONS_FIELDS,
  SESSIONS_TAGS,
} from '../widgetBuilder/releaseWidget/fields';
import {
  derivedMetricsToField,
  resolveDerivedStatusFields,
} from '../widgetCard/releaseWidgetQueries';
import {getSeriesName} from '../widgetCard/transformSessionsResponseToSeries';
import {
  changeObjectValuesToTypes,
  getDerivedMetrics,
  mapDerivedMetricsToFields,
} from '../widgetCard/transformSessionsResponseToTable';

import {DatasetConfig, handleOrderByReset} from './base';

const DEFAULT_WIDGET_QUERY: WidgetQuery = {
  name: '',
  fields: [`crash_free_rate(${SessionField.SESSION})`],
  columns: [],
  fieldAliases: [],
  aggregates: [`crash_free_rate(${SessionField.SESSION})`],
  conditions: '',
  orderby: `-crash_free_rate(${SessionField.SESSION})`,
};

export const ReleasesConfig: DatasetConfig<
  SessionApiResponse | MetricsApiResponse,
  SessionApiResponse | MetricsApiResponse
> = {
  defaultWidgetQuery: DEFAULT_WIDGET_QUERY,
  filterTableOptions: filterPrimaryReleaseTableOptions,
  filterTableAggregateParams: filterAggregateParams,
  getCustomFieldRenderer: (field, meta) => getFieldRenderer(field, meta, false),
  getTableFieldOptions: getReleasesTableFieldOptions,
  handleColumnFieldChangeOverride,
  handleOrderByReset: handleReleasesTableOrderByReset,
  supportedDisplayTypes: [
    DisplayType.AREA,
    DisplayType.BAR,
    DisplayType.BIG_NUMBER,
    DisplayType.LINE,
    DisplayType.TABLE,
    DisplayType.TOP_N,
  ],
  transformSeries: transformSessionsResponseToSeries,
  transformTable: transformSessionsResponseToTable,
};

function filterPrimaryReleaseTableOptions(option: FieldValueOption) {
  return [
    FieldValueKind.FUNCTION,
    FieldValueKind.FIELD,
    FieldValueKind.NUMERIC_METRICS,
  ].includes(option.value.kind);
}

function filterAggregateParams(option: FieldValueOption) {
  return option.value.kind === FieldValueKind.METRICS;
}

function handleReleasesTableOrderByReset(widgetQuery: WidgetQuery, newFields: string[]) {
  const disableSortBy = widgetQuery.columns.includes('session.status');
  if (disableSortBy) {
    widgetQuery.orderby = '';
  }
  return handleOrderByReset(widgetQuery, newFields);
}

function handleColumnFieldChangeOverride(widgetQuery: WidgetQuery): WidgetQuery {
  if (widgetQuery.aggregates.length === 0) {
    // Release Health widgets require an aggregate in tables
    const defaultReleaseHealthAggregate = `crash_free_rate(${SessionField.SESSION})`;
    widgetQuery.aggregates = [defaultReleaseHealthAggregate];
    widgetQuery.fields = widgetQuery.fields
      ? [...widgetQuery.fields, defaultReleaseHealthAggregate]
      : [defaultReleaseHealthAggregate];
  }
  return widgetQuery;
}

function getReleasesTableFieldOptions(_organization: Organization) {
  return generateReleaseWidgetFieldOptions(Object.values(SESSIONS_FIELDS), SESSIONS_TAGS);
}

export function transformSessionsResponseToTable(
  data: SessionApiResponse | MetricsApiResponse,
  widgetQuery: WidgetQuery
): TableData {
  const useSessionAPI = widgetQuery.columns.includes('session.status');
  const {derivedStatusFields, injectedFields} = resolveDerivedStatusFields(
    widgetQuery.aggregates,
    widgetQuery.orderby,
    useSessionAPI
  );
  const rows = data.groups.map((group, index) => ({
    id: String(index),
    ...mapDerivedMetricsToFields(group.by),
    // if `sum(session)` or `count_unique(user)` are not
    // requested as a part of the payload for
    // derived status metrics through the Sessions API,
    // they are injected into the payload and need to be
    // stripped.
    ...omit(mapDerivedMetricsToFields(group.totals), injectedFields),
    // if session.status is a groupby, some post processing
    // is needed to calculate the status derived metrics
    // from grouped results of `sum(session)` or `count_unique(user)`
    ...getDerivedMetrics(group.by, group.totals, derivedStatusFields),
  }));

  const singleRow = rows[0];
  const meta = {
    ...changeObjectValuesToTypes(omit(singleRow, 'id')),
  };
  return {meta, data: rows};
}

export function transformSessionsResponseToSeries(
  data: SessionApiResponse | MetricsApiResponse,
  widgetQuery: WidgetQuery
) {
  if (data === null) {
    return [];
  }

  const queryAlias = widgetQuery.name;

  const useSessionAPI = widgetQuery.columns.includes('session.status');
  const {derivedStatusFields: requestedStatusMetrics, injectedFields} =
    resolveDerivedStatusFields(
      widgetQuery.aggregates,
      widgetQuery.orderby,
      useSessionAPI
    );

  const results: Series[] = [];

  if (!data.groups.length) {
    return [
      {
        seriesName: `(${t('no results')})`,
        data: data.intervals.map(interval => ({
          name: interval,
          value: 0,
        })),
      },
    ];
  }

  data.groups.forEach(group => {
    Object.keys(group.series).forEach(field => {
      // if `sum(session)` or `count_unique(user)` are not
      // requested as a part of the payload for
      // derived status metrics through the Sessions API,
      // they are injected into the payload and need to be
      // stripped.
      if (!!!injectedFields.includes(derivedMetricsToField(field))) {
        results.push({
          seriesName: getSeriesName(field, group, queryAlias),
          data: data.intervals.map((interval, index) => ({
            name: interval,
            value: group.series[field][index] ?? 0,
          })),
        });
      }
    });
    // if session.status is a groupby, some post processing
    // is needed to calculate the status derived metrics
    // from grouped results of `sum(session)` or `count_unique(user)`
    if (requestedStatusMetrics.length && defined(group.by['session.status'])) {
      requestedStatusMetrics.forEach(status => {
        const result = status.match(DERIVED_STATUS_METRICS_PATTERN);
        if (result) {
          let metricField: string | undefined = undefined;
          if (group.by['session.status'] === result[1]) {
            if (result[2] === 'session') {
              metricField = 'sum(session)';
            } else if (result[2] === 'user') {
              metricField = 'count_unique(user)';
            }
          }
          results.push({
            seriesName: getSeriesName(status, group, queryAlias),
            data: data.intervals.map((interval, index) => ({
              name: interval,
              value: metricField ? group.series[metricField][index] ?? 0 : 0,
            })),
          });
        }
      });
    }
  });

  return results;
}

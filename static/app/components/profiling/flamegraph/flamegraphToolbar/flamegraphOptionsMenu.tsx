import {Fragment, useCallback} from 'react';

import {Button} from 'sentry/components/button';
import {CompactSelect, SelectOption} from 'sentry/components/compactSelect';
import {useFlamegraphPreferences} from 'sentry/domains/profiling/hooks/useFlamegraphPreferences';
import {CanvasPoolManager} from 'sentry/domains/profiling/utils/profiling/canvasScheduler';
import {FlamegraphPreferences} from 'sentry/domains/profiling/providers/flamegraphStateProvider/reducers/flamegraphPreferences';
import {useDispatchFlamegraphState} from 'sentry/domains/profiling/utils/profiling/flamegraph/hooks/useFlamegraphState';
import {IconSliders} from 'sentry/icons';
import {t} from 'sentry/locale';

interface FlamegraphOptionsMenuProps {
  canvasPoolManager: CanvasPoolManager;
}

function FlamegraphOptionsMenu({
  canvasPoolManager,
}: FlamegraphOptionsMenuProps): React.ReactElement {
  const {colorCoding} = useFlamegraphPreferences();
  const dispatch = useDispatchFlamegraphState();

  const onColorChange = useCallback(
    (opt: SelectOption<any>) => {
      dispatch({
        type: 'set color coding',
        payload: opt.value,
      });
    },
    [dispatch]
  );

  return (
    <Fragment>
      <Button size="xs" onClick={() => canvasPoolManager.dispatch('reset zoom', [])}>
        {t('Reset Zoom')}
      </Button>
      <CompactSelect
        triggerLabel={t('Color Coding')}
        triggerProps={{icon: <IconSliders size="xs" />, size: 'xs'}}
        options={colorCodingOptions}
        position="bottom-end"
        value={colorCoding}
        closeOnSelect={false}
        onChange={onColorChange}
      />
    </Fragment>
  );
}

const colorCodingOptions: SelectOption<FlamegraphPreferences['colorCoding']>[] = [
  {value: 'by system vs application frame', label: t('By System vs Application Frame')},
  {value: 'by symbol name', label: t('By Symbol Name')},
  {value: 'by library', label: t('By Package')},
  {value: 'by system frame', label: t('By System Frame')},
  {value: 'by application frame', label: t('By Application Frame')},
  {value: 'by recursion', label: t('By Recursion')},
  {value: 'by frequency', label: t('By Frequency')},
];

export {FlamegraphOptionsMenu};

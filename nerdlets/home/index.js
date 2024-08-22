import React, { useContext, useEffect } from 'react';
import { nerdlet, PlatformStateContext } from 'nr1';
import OverviewPage from './overview';

// https://docs.newrelic.com/docs/new-relic-programmable-platform-introduction

const AqmNerdlet = () => {
  const { timeRange } = useContext(PlatformStateContext);

  useEffect(() => {
    nerdlet.setConfig({
      accountPicker: false,
      timePicker: true,
      timePickerDefaultOffset: 1000 * 60 * 60 * 24, // default last 24 hours
      timePickerRanges: [
        // { label: '60 minutes', offset: 3600000 },
        // { label: '3 hours', offset: 10800000 },
        // { label: '6 hours', offset: 21600000 },
        { label: '12 hours', offset: 43200000 },
        { label: '24 hours', offset: 86400000 },
        { label: '3 days', offset: 259200000 },
        { label: '7 days', offset: 604800000 },
        { label: '14 days', offset: 1209600000 },
        { label: '30 days', offset: 2592000000 }
        //{ label: '90 days', offset: 7776000000 }
      ]
    })
  }, [timeRange.duration]);


  return <OverviewPage timeRange={timeRange}/>

}

export default AqmNerdlet;

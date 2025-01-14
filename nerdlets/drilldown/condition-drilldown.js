import React, { useContext, useEffect, useState } from 'react';
import { PlatformStateContext, Spinner } from 'nr1';
import { getPolicies } from '../shared/utils';
import ConditionHistory from './conditions';

const ConditionDrilldown = ({ selectedAccount }) => {
  const { timeRange } = useContext(PlatformStateContext);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState([]);

  useEffect(() => {
    const fetchAndSetPolicies = async () => {
      let start = new Date(Date.now());

      const data = await getPolicies(selectedAccount, null);
      setPolicies(data);
      setLoading(false);
    };

    fetchAndSetPolicies(selectedAccount);

  }, [selectedAccount, timeRange]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center'}}>
        <h3>Loading</h3>
        <Spinner type={Spinner.TYPE.DOT}/>
      </div>
    );
  }

  if (!loading && policies.length > 0) {
    return <ConditionHistory selectedAccount={selectedAccount} timeRange={timeRange} policies={policies}/>;
  }

  return <h2>No Policies Found</h2>

}

export default ConditionDrilldown;

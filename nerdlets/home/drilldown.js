import React from 'react';
import PropTypes from 'prop-types';
import { Tab } from 'semantic-ui-react';
import Notifications from '../drilldown/notifications';
import Incidents from '../drilldown/incidents';
import ConditionDrilldown from '../drilldown/condition-drilldown';
import Entities from '../drilldown/entities';
import CcuOptimization from '../drilldown/ccu';

const Drilldown = ({ account, filters, activeIndex, onTabChange }) => {
  const panes = [
    {
      menuItem: 'Alerts',
      render: () => (
        <Tab.Pane>
          <Incidents selectedAccount={account} filters={filters} />
        </Tab.Pane>
      ),
    },
    {
      menuItem: 'Notifications',
      render: () => (
        <Tab.Pane>
          <Notifications selectedAccount={account} />
        </Tab.Pane>
      ),
    },
    {
      menuItem: 'Entity Coverage',
      render: () => (
        <Tab.Pane>
          <Entities selectedAccount={account} filters={filters} />
        </Tab.Pane>
      ),
    },
    {
      menuItem: 'Condition History',
      render: () => (
        <Tab.Pane>
          <ConditionDrilldown selectedAccount={account} />
        </Tab.Pane>
      ),
    },
    {
      menuItem: 'CCU Optimization',
      render: () => (
        <Tab.Pane>
          <CcuOptimization selectedAccount={account} />
        </Tab.Pane>
      ),
    },
  ];

  return (
    <Tab panes={panes} activeIndex={activeIndex} onTabChange={onTabChange} />
  );
};

Drilldown.propTypes = {
  account: PropTypes.object,
  filters: PropTypes.array,
  activeIndex: PropTypes.number.isRequired,
  onTabChange: PropTypes.func.isRequired,
};

export default Drilldown;

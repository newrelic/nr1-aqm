import React from 'react';
import { Tab } from 'semantic-ui-react';
import Notifications from '../drilldown/notifications';
import Incidents from '../drilldown/incidents';
import ConditionDrilldown from '../drilldown/condition-drilldown';
import Entities from '../drilldown/entities';

const Drilldown = ({ account }) => {
  const panes = [
    {
      menuItem: 'Alerts',
      render: () => (
        <Tab.Pane>
          <Incidents selectedAccount={account}/>
        </Tab.Pane>
      )
    },
    {
      menuItem: 'Notifications',
      render: () => (
        <Tab.Pane>
          <Notifications selectedAccount={account}/>
        </Tab.Pane>
      )
    },
    {
      menuItem: 'Entity Coverage',
      render: () => (
        <Tab.Pane>
          <Entities selectedAccount={account}/>
        </Tab.Pane>
      )
    },
    {
      menuItem: 'Condition History',
      render: () => (
        <Tab.Pane>
          <ConditionDrilldown selectedAccount={account}/>
        </Tab.Pane>
      )
    }
  ];

  return <Tab panes={panes}/>
}

export default Drilldown;

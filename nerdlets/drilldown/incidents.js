import React, { useMemo, useState } from 'react';
import { navigation, Table, TableHeader, TableHeaderCell, TableRow, TableRowCell, TextField } from 'nr1';

const Incidents = ({selectedAccount, timeRange, incidents, selectedCard}) => {
  const [searchText, setSearchText] = useState('');

  const openQWindow = (type, policy, condition) => {
    const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;
    let q = ``;

    if (type == 'flapping') {
      q = `FROM NrAiIncident SELECT count(*) where event = 'close' and durationSeconds <= 300 and policyName = '${policy}' and conditionName = '${condition}' ${timeClause} TIMESERIES MAX`;
    } else {
      q = `FROM NrAiIncident SELECT count(*) where event = 'close' and durationSeconds >= 86400 and policyName = '${policy}' and conditionName = '${condition}' ${timeClause} TIMESERIES MAX`;
    }

    const qBuilder = {
      id: 'data-exploration.query-builder',
      urlState: {
        initialActiveInterface: 'nrqlEditor',
        initialAccountId: selectedAccount.accountId,
        initialNrqlValue: q,
        initialWidget: {
          visualization: {
            'id': 'viz.line'
          }
        },
        isViewingQuery: true
      }
    }

    navigation.openStackedNerdlet(qBuilder);
  };

  const renderFlappingIncidents = () => {
    if (incidents?.under5Drilldown?.length > 0 && Number(incidents.under5Summary) > 0) {

      const filtered = incidents.under5Drilldown.filter(i => {
        return (
          i.facet[0].toLowerCase().includes(searchText.toLowerCase()) ||
          i.facet[1].toLowerCase().includes(searchText.toLowerCase())
        );
      });

      return (
        <>
          <TextField
            placeholder='Search policy/condition..'
            value={searchText || ''}
            type={TextField.TYPE.SEARCH}
            onChange={e => setSearchText(e.target.value)}
            style={{marginTop: '20px'}}
          />
          <Table items={filtered}>
            <TableHeader>
              <TableHeaderCell
              value={({ item }) => item.facet[0]}
              >
              <b>Policy</b>
              </TableHeaderCell>
              <TableHeaderCell
              value={({ item }) => item.facet[1]}
              >
              <b>Condition</b>
              </TableHeaderCell>
              <TableHeaderCell
              value={({ item }) => item.percentUnder5}
              >
              <b>Flapping Incident %</b>
              </TableHeaderCell>
            </TableHeader>
            {({ item }) => (
              <TableRow onClick={() => openQWindow('flapping', item.facet[0], item.facet[1])}>
                <TableRowCell>{item.facet[0]}</TableRowCell>
                <TableRowCell>{item.facet[1]}</TableRowCell>
                <TableRowCell>{item.percentUnder5.toFixed(2)}%</TableRowCell>
              </TableRow>
            )}
          </Table>
        </>
      )
    }

    return <h2>No Flapping Incidents!</h2>
  }

  const renderLongIncidents = () => {
    if (incidents?.over1Drilldown?.length > 0 && Number(incidents.over1Summary) > 0) {

      const filtered = incidents.over1Drilldown.filter(i => {
        return (
          i.facet[0].toLowerCase().includes(searchText.toLowerCase()) ||
          i.facet[1].toLowerCase().includes(searchText.toLowerCase())
        );
      });
      return (
        <>
        <TextField
          placeholder='Search policy/condition..'
          value={searchText || ''}
          type={TextField.TYPE.SEARCH}
          onChange={e => setSearchText(e.target.value)}
          style={{marginTop: '20px'}}
        />
        <Table items={filtered}>
          <TableHeader>
            <TableHeaderCell
            value={({ item }) => item.facet[0]}
            >
            <b>Policy</b>
            </TableHeaderCell>
            <TableHeaderCell
            value={({ item }) => item.facet[1]}
            >
            <b>Condition</b>
            </TableHeaderCell>
            <TableHeaderCell
            value={({ item }) => item.percentOverADay}
            >
            <b>Long Running Incident %</b>
            </TableHeaderCell>
          </TableHeader>
          {({ item }) => (
            <TableRow onClick={() => openQWindow('long', item.facet[0], item.facet[1])}>
              <TableRowCell>{item.facet[0]}</TableRowCell>
              <TableRowCell>{item.facet[1]}</TableRowCell>
              <TableRowCell>{item.percentOverADay.toFixed(2)}%</TableRowCell>
            </TableRow>
          )}
        </Table>
        </>
      )
    }

    return <h2>No Long Running Incidents!</h2>
  }

  if (incidents !== null && incidents !== undefined) {
    return useMemo(() => {
      return (
        <div>
          {selectedCard == 'flapping_incidents'
          ?
          renderFlappingIncidents()
          :
          renderLongIncidents()
          }
        </div>
      )
    }, [incidents, selectedCard, searchText]);
  }
};

export default Incidents;

import React, { useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  getIncidents,
  getCardColor,
  getTooltip,
  filtersArrayToNrql,
} from '../shared/utils';
import ExportButton from '../shared/export';
import { Card, Icon, Statistic } from 'semantic-ui-react';
import {
  navigation,
  PlatformStateContext,
  Spinner,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  TextField,
  Tooltip,
} from 'nr1';

const openQWindow = (
  type,
  policy,
  condition,
  timeRange,
  filters,
  selectedAccount
) => {
  const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;
  const filterClause =
    filters && filters !== '' ? filtersArrayToNrql(filters) : '';

  let q = ``;

  if (type == 'short') {
    q = `FROM NrAiIncident SELECT count(*) where ${
      filterClause !== '' ? `${filterClause} and` : ''
    } event = 'close' and durationSeconds <= 300 and policyName = '${policy}' and conditionName = '${condition}' ${timeClause} TIMESERIES MAX`;
  } else {
    q = `FROM NrAiIncident SELECT count(*) where ${
      filterClause !== '' ? `${filterClause} and` : ''
    } event = 'close' and durationSeconds >= 86400 and policyName = '${policy}' and conditionName = '${condition}' ${timeClause} TIMESERIES MAX`;
  }

  const qBuilder = {
    id: 'data-exploration.query-builder',
    urlState: {
      initialActiveInterface: 'nrqlEditor',
      initialAccountId: selectedAccount.accountId,
      initialNrqlValue: q,
      initialWidget: {
        visualization: {
          id: 'viz.line',
        },
      },
      isViewingQuery: true,
    },
  };

  navigation.openStackedNerdlet(qBuilder);
};

const Incidents = ({ selectedAccount, filters }) => {
  const { timeRange } = useContext(PlatformStateContext);
  const [incidents, setIncidents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCard, setSelectedCard] = useState('short_incidents');

  useEffect(() => {
    const fetchAndSetIncidents = async () => {
      setLoading(true);
      const filterClause =
        filters && filters !== '' ? filtersArrayToNrql(filters) : '';
      const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;
      const data = await getIncidents(
        selectedAccount,
        filterClause,
        timeClause
      );

      setIncidents(data);
      setLoading(false);
    };

    fetchAndSetIncidents();
  }, [selectedAccount, timeRange, filters]);

  const renderShortIncidents = useMemo(() => {
    if (
      incidents?.under5Drilldown?.length > 0 &&
      Number(incidents.under5Summary) > 0
    ) {
      const filtered = incidents.under5Drilldown.filter((i) => {
        return (
          i.percentUnder5 > 0 &&
          (i.facet[0].toLowerCase().includes(searchText.toLowerCase()) ||
            i.facet[1].toLowerCase().includes(searchText.toLowerCase()))
        );
      });

      return (
        <>
          <TextField
            placeholder="Search policy/condition.."
            value={searchText || ''}
            type={TextField.TYPE.SEARCH}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ marginTop: '20px' }}
          />
          <ExportButton
            data={filtered}
            type="short_incidents"
            filename={`short_incidents.csv`}
            displayText="Export"
          />
          <Table items={filtered}>
            <TableHeader>
              <TableHeaderCell value={({ item }) => item.facet[0]}>
                <b>Policy</b>
              </TableHeaderCell>
              <TableHeaderCell value={({ item }) => item.facet[1]}>
                <b>Condition</b>
              </TableHeaderCell>
              <TableHeaderCell value={({ item }) => item.percentUnder5}>
                <b>Short Lived Incident %</b>
              </TableHeaderCell>
            </TableHeader>
            {({ item }) => (
              <TableRow
                onClick={() =>
                  openQWindow(
                    'short',
                    item.facet[0],
                    item.facet[1],
                    timeRange,
                    filters,
                    selectedAccount
                  )
                }
              >
                <TableRowCell>{item.facet[0]}</TableRowCell>
                <TableRowCell>{item.facet[1]}</TableRowCell>
                <TableRowCell
                  style={{
                    color: getCardColor(Number(item.percentUnder5), null),
                  }}
                >
                  {item.percentUnder5.toFixed(2)}%
                </TableRowCell>
              </TableRow>
            )}
          </Table>
        </>
      );
    }

    return <h2>No Short Lived Incidents!</h2>;
  }, [incidents, selectedCard, searchText]);

  const renderLongIncidents = useMemo(() => {
    if (
      incidents?.over1Drilldown?.length > 0 &&
      Number(incidents.over1Summary) > 0
    ) {
      const filtered = incidents.over1Drilldown.filter((i) => {
        return (
          i.percentOverADay > 0 &&
          (i.facet[0].toLowerCase().includes(searchText.toLowerCase()) ||
            i.facet[1].toLowerCase().includes(searchText.toLowerCase()))
        );
      });
      return (
        <>
          <TextField
            placeholder="Search policy/condition.."
            value={searchText || ''}
            type={TextField.TYPE.SEARCH}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ marginTop: '20px' }}
          />
          <ExportButton
            data={filtered}
            type="long_incidents"
            filename={`long_incidents.csv`}
            displayText="Export"
          />
          <Table items={filtered}>
            <TableHeader>
              <TableHeaderCell value={({ item }) => item.facet[0]}>
                <b>Policy</b>
              </TableHeaderCell>
              <TableHeaderCell value={({ item }) => item.facet[1]}>
                <b>Condition</b>
              </TableHeaderCell>
              <TableHeaderCell value={({ item }) => item.percentOverADay}>
                <b>Long Running Incident %</b>
              </TableHeaderCell>
            </TableHeader>
            {({ item }) => (
              <TableRow
                onClick={() =>
                  openQWindow(
                    'long',
                    item.facet[0],
                    item.facet[1],
                    timeRange,
                    filters,
                    selectedAccount
                  )
                }
              >
                <TableRowCell>{item.facet[0]}</TableRowCell>
                <TableRowCell>{item.facet[1]}</TableRowCell>
                <TableRowCell
                  style={{
                    color: getCardColor(Number(item.percentOverADay), null),
                  }}
                >
                  {item.percentOverADay.toFixed(2)}%
                </TableRowCell>
              </TableRow>
            )}
          </Table>
        </>
      );
    }

    return <h2>No Long Running Incidents!</h2>;
  }, [incidents, selectedCard, searchText]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h3>Loading</h3>
        <Spinner type={Spinner.TYPE.DOT} />
      </div>
    );
  }

  if (incidents !== null && incidents !== undefined && !loading) {
    return (
      <div id="drilldown">
        <Card.Group
          style={{ textAlign: 'center' }}
          id="card-group"
          itemsPerRow={2}
        >
          <Card
            color={getCardColor(Number(incidents.under5Summary), null)}
            onClick={() => setSelectedCard('short_incidents')}
          >
            <Card.Header>
              <h3>
                <Tooltip
                  text={getTooltip('short_incidents')}
                  placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
                >
                  <Icon name="help circle" />
                </Tooltip>
                Short Lived Incidents
              </h3>
            </Card.Header>
            <Card.Content>
              <Statistic
                color={getCardColor(Number(incidents.under5Summary), null)}
              >
                <Statistic.Value>
                  {incidents.under5Summary == undefined
                    ? 0
                    : Number(incidents.under5Summary)}
                  %
                </Statistic.Value>
              </Statistic>
            </Card.Content>
          </Card>
          <Card
            color={getCardColor(Number(incidents.over1Summary), null)}
            onClick={() => setSelectedCard('long_incidents')}
          >
            <Card.Header>
              <h3>
                <Tooltip
                  text={getTooltip('long_incidents')}
                  placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
                >
                  <Icon name="help circle" />
                </Tooltip>
                Long Running Incidents
              </h3>
            </Card.Header>
            <Card.Content>
              <Statistic
                color={getCardColor(Number(incidents.over1Summary), null)}
              >
                <Statistic.Value>
                  {incidents.over1Summary == undefined
                    ? 0
                    : Number(incidents.over1Summary)}
                  %
                </Statistic.Value>
              </Statistic>
            </Card.Content>
          </Card>
        </Card.Group>
        {selectedCard == 'short_incidents' ? renderShortIncidents : ''}
        {selectedCard == 'long_incidents' ? renderLongIncidents : ''}
      </div>
    );
  }

  return <h2>No incidents returned</h2>;
};

Incidents.propTypes = {
  selectedAccount: PropTypes.object,
  filters: PropTypes.array,
};

export default Incidents;

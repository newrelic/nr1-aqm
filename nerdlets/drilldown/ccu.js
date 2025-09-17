import React, { useEffect, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import {
  PlatformStateContext,
  Spinner,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  Toast,
} from 'nr1';
import { getTopCcuConditions } from '../shared/utils';
import ExportButton from '../shared/export';
import {
  Accordion,
  Divider,
  Grid,
  GridColumn,
  GridRow,
  Icon,
  Modal,
  Segment,
} from 'semantic-ui-react';

const CcuOptimization = ({ selectedAccount }) => {
  const { timeRange } = useContext(PlatformStateContext);
  const [loading, setLoading] = useState(true);
  const [topConditions, setTopConditions] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openRecommendations, setOpenRecommendations] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState(null);

  useEffect(() => {
    const fetchTopConditions = async () => {
      setLoading(true);
      const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;
      const conditions = await getTopCcuConditions(timeClause, selectedAccount);
      setTopConditions(conditions);
      setLoading(false);
    };
    fetchTopConditions();
  }, [selectedAccount, timeRange]);

  const handleClick = (e, props) => {
    const { index } = props; // eslint-disable-line react/prop-types
    const newIndex = activeIndex === index ? -1 : index;
    setActiveIndex(newIndex);
  };

  const _openCondition = (conditionId) => {
    let guid = btoa(
      `${selectedAccount.accountId}|AIOPS|CONDITION|${conditionId}`
    );
    if (guid.endsWith('=')) {
      guid = guid.slice(0, -1);
    }

    window.open(
      `https://one.newrelic.com/redirect/entity/${guid}`,
      '_blank',
      'noreferrer'
    );
  };

  const _openRecommendations = (selectedCondition) => {
    setSelectedCondition(selectedCondition);
    setOpenRecommendations(true);
  };

  const _closeRecommendations = () => {
    setSelectedCondition(null);
    setOpenRecommendations(false);
  };

  const renderRecommendationList = () => {
    if (selectedCondition.recommendations.length > 0) {
      return (
        <ul style={{ marginLeft: '2%' }}>
          {selectedCondition.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      );
    }

    return '';
  };

  const renderInstruction = () => {
    return (
      <>
        {selectedCondition !== null ? (
          <Modal
            size="tiny"
            open={openRecommendations}
            onClose={_closeRecommendations}
            closeIcon
          >
            <Modal.Header>
              Recommendations for Condition: {selectedCondition.name}
            </Modal.Header>
            <Modal.Content>{renderRecommendationList()}</Modal.Content>
          </Modal>
        ) : (
          ''
        )}
        <div style={{ marginBottom: '20px' }}>
          <h5>
            Expand any section below for more information around alert condition
            tuning to reduce CCU. Select the last column to view options for
            opening the condition or viewing optimization recommendations.
          </h5>
          <Accordion fluid styled>
            <Accordion.Title
              active={activeIndex === 0}
              index={0}
              onClick={handleClick}
            >
              <Icon name="dropdown" />
              Query Optimization
            </Accordion.Title>
            <Accordion.Content active={activeIndex === 0}>
              <p>
                Avoid broad queries targeting large amounts of data and use{' '}
                <code>WHERE</code> filters to lessen the amount of events
                scanned. When using NRQL filtering, try to use filters outside
                of the <code>SELECT</code> statement if possible. Alert
                conditions will match incoming data points that meet the
                criteria of filters applied <i>after</i> the <code>FROM</code>{' '}
                clause.
              </p>
              <Segment>
                <Grid columns={2} stackable textAlign="center">
                  <Divider vertical />
                  <GridRow verticalAlign="center">
                    <GridColumn>
                      <h3 style={{ color: 'green' }}>
                        Good <Icon color="green" name="check circle" />
                      </h3>
                    </GridColumn>
                    <GridColumn>
                      <h3 style={{ color: 'red' }}>
                        Bad <Icon color="red" name="x" />
                      </h3>
                    </GridColumn>
                  </GridRow>
                  <GridRow verticalAlign="center">
                    <GridColumn>
                      <code>{`FROM Transaction SELECT count(*) where appName like '%prod%'`}</code>
                    </GridColumn>
                    <GridColumn>
                      <code className="bad">
                        FROM Transaction SELECT count(*)
                      </code>
                    </GridColumn>
                  </GridRow>
                  <GridRow verticalAlign="center">
                    <GridColumn>
                      <code>
                        FROM Log SELECT count(*){' '}
                        <b>where message like &apos;%error%&apos;</b> FACET
                        hostname
                      </code>
                    </GridColumn>
                    <GridColumn>
                      <code className="bad">
                        FROM Log SELECT filter(count(*),{' '}
                        <b>where message like &apos;%error%&apos;</b>) FACET
                        hostname
                      </code>
                    </GridColumn>
                  </GridRow>
                </Grid>
              </Segment>
            </Accordion.Content>
            <Accordion.Title
              active={activeIndex === 1}
              index={1}
              onClick={handleClick}
            >
              <Icon name="dropdown" />
              Sliding Window
            </Accordion.Title>
            <Accordion.Content active={activeIndex === 1}>
              <p>
                Validate if{' '}
                <a
                  href="https://docs.newrelic.com/docs/alerts/create-alert/create-alert-condition/create-nrql-alert-conditions/#sliding-window-aggregation"
                  target="_blank"
                  rel="noreferrer"
                >
                  Sliding Window
                </a>{' '}
                is truly needed. When enabled, this may cause data points to
                match multiple overlapping time windows, which increases CCU.
              </p>
            </Accordion.Content>
            <Accordion.Title
              active={activeIndex === 2}
              index={2}
              onClick={handleClick}
            >
              <Icon name="dropdown" />
              Noisy Conditions
            </Accordion.Title>
            <Accordion.Content active={activeIndex === 2}>
              <p>
                Remove noisy alert conditions that may be non-actionable. This
                can include conditions that trigger short-lived issues (open
                time &lt; 5 minutes) or do not route to any destinations. See
                other tabs for drilldowns into those areas.
              </p>
            </Accordion.Content>
          </Accordion>
        </div>
      </>
    );
  };

  const renderConditionTable = () => {
    const actions = [
      {
        label: 'View Condition',
        onClick: (evt, { item }) => {
          _openCondition(item.facet);
        },
      },
      {
        label: 'View Recommendations',
        onClick: (evt, { item }) => {
          if (item.recommendations.length > 0) {
            _openRecommendations(item);
          } else {
            Toast.showToast({
              title: 'No recommendations available',
              description: `${item.name} has no optimization recommendations`,
              type: Toast.TYPE.NORMAL,
            });
          }
        },
      },
    ];

    return (
      <Table items={topConditions}>
        <TableHeader>
          <TableHeaderCell value={({ item }) => item.facet}>
            <b>Condition ID</b>
          </TableHeaderCell>
          <TableHeaderCell value={({ item }) => item.name}>
            <b>Condition Name</b>
          </TableHeaderCell>
          <TableHeaderCell width="3fr" value={({ item }) => item.nrql}>
            <b>NRQL</b>
          </TableHeaderCell>
          <TableHeaderCell value={({ item }) => item.ccu}>
            <b># CCUs</b>
          </TableHeaderCell>
          <TableHeaderCell>
            <b>% CCU vs Total</b>
          </TableHeaderCell>
        </TableHeader>
        {({ item }) => (
          <TableRow actions={actions}>
            <TableRowCell>{item.facet}</TableRowCell>
            <TableRowCell>{item.name}</TableRowCell>
            <TableRowCell>{item.nrql}</TableRowCell>
            <TableRowCell>{Math.round(item.ccu)}</TableRowCell>
            <TableRowCell>
              {Math.round(
                (Math.round(item.ccu) / Math.round(selectedAccount.ccu)) * 100
              )}
              %
            </TableRowCell>
          </TableRow>
        )}
      </Table>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h3>Loading</h3>
        <Spinner type={Spinner.TYPE.DOT} />
      </div>
    );
  }

  if (!loading && topConditions && topConditions.length > 0) {
    return (
      <>
        {renderInstruction()}
        <ExportButton
          data={topConditions}
          type="ccu"
          filename={`alert_conditions_ccu.csv`}
          displayText="Export"
        />
        {renderConditionTable()}
      </>
    );
  }

  return <h2>No Conditions Consuming CCU Found!</h2>;
};

CcuOptimization.propTypes = {
  selectedAccount: PropTypes.object,
};

export default CcuOptimization;

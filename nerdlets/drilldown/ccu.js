import React, { useEffect, useState } from 'react';
import { navigation, NrqlQuery, Spinner, Table, TableHeader, TableHeaderCell, TableRow, TableRowCell } from 'nr1';
import { getTopCcuConditions } from '../shared/utils';
import { Accordion, Divider, Grid, GridColumn, GridRow, Icon, Segment } from 'semantic-ui-react';

//TODO:
//Bug: row onClick only works for NRQL type conditions, need dimensions added to NrComputeUsage

const CcuOptimization = ({ selectedAccount, timeRange }) => {
  const [loading, setLoading] = useState(true);
  const [topConditions, setTopConditions] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const fetchTopConditions = async () => {
    const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;
    const conditions = await getTopCcuConditions(timeClause, selectedAccount);
    setTopConditions(conditions);
  }

  useEffect(async () => {
    await fetchTopConditions();
    setLoading(false);
  }, [selectedAccount, timeRange])

  const openConditionEditor = (condition) => {
    const condEdit = {
      id: 'condition-builder.edit',
      urlState: {
        conditionId: condition,
        accountId: selectedAccount.accountId
      }
    }

    navigation.openStackedNerdlet(condEdit);
  };

  const handleClick = (e, props) => {
    const { index } = props;
    const newIndex = activeIndex === index ? -1 : index
    setActiveIndex(newIndex);
  }

  const renderInstruction = () => {
    return (
      <div style={{marginBottom: '20px'}}>
        <h5>Expand any section below for more information around alert condition tuning to reduce CCU. Select any condition from the table to open its current configuration.</h5>
        <Accordion fluid styled>
          <Accordion.Title
            active={activeIndex === 0}
            index={0}
            onClick={handleClick}
          >
           <Icon name='dropdown' />
            Query Optimization
          </Accordion.Title>
         <Accordion.Content active={activeIndex === 0}>
          <p>Avoid broad queries targeting large amounts of data and use <code>WHERE</code> filters to lessen the amount of events scanned. When using NRQL filtering, try to use filters outside of the <code>SELECT</code> statement if possible. Alert conditions will match incoming data points that meet the criteria of filters applied <i>after</i> the <code>FROM</code> clause.</p>
          <Segment>
            <Grid columns={2} stackable textAlign='center'>
              <Divider vertical />
              <GridRow verticalAlign='center'>
                <GridColumn>
                  <h3 style={{color: 'green'}}>Good <Icon color='green' name='check circle'/></h3>
                </GridColumn>
                <GridColumn>
                  <h3 style={{color: 'red'}}>Bad <Icon color='red' name='x'/></h3>
                </GridColumn>
              </GridRow>
              <GridRow verticalAlign='center'>
                <GridColumn>
                  <code>FROM Transaction SELECT count(*) where appName like '%prod%'</code>
                </GridColumn>
                <GridColumn>
                  <code class='bad'>FROM Transaction SELECT count(*)</code>
                </GridColumn>
              </GridRow>
              <GridRow verticalAlign='center'>
                <GridColumn>
                  <code>FROM Log SELECT count(*) <b>where message like '%error%'</b> FACET hostname</code>
                </GridColumn>
                <GridColumn>
                  <code class='bad'>FROM Log SELECT filter(count(*), <b>where message like '%error%'</b>) FACET hostname</code>
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
          <Icon name='dropdown' />
          Sliding Window
         </Accordion.Title>
        <Accordion.Content active={activeIndex === 1}>
         <p>Validate if <a href='https://docs.newrelic.com/docs/alerts/create-alert/create-alert-condition/create-nrql-alert-conditions/#sliding-window-aggregation' target='_blank'>Sliding Window</a> is truly needed. When enabled, this may cause data points to match multiple overlapping time windows, which increases CCU.</p>
        </Accordion.Content>
        <Accordion.Title
          active={activeIndex === 2}
          index={2}
          onClick={handleClick}
        >
         <Icon name='dropdown' />
         Noisy Conditions
        </Accordion.Title>
       <Accordion.Content active={activeIndex === 2}>
        <p>Remove noisy alert conditions that may be non-actionable. This can include conditions that trigger short-lived issues (open time &lt; 5 minutes) or do not route to any destinations. See Overview tab for drilldowns into those areas.</p>
       </Accordion.Content>
        </Accordion>
      </div>
    )
  }

  const renderConditionTable = () => {
    return (
      <Table items={topConditions}>
        <TableHeader>
          <TableHeaderCell
          value={({ item }) => item.facet}
          >
          <b>Condition ID</b>
          </TableHeaderCell>
          <TableHeaderCell
          value={({ item }) => item.ccu}
          >
          <b># CCUs</b>
          </TableHeaderCell>
          <TableHeaderCell>
            <b>% CCU vs Total</b>
          </TableHeaderCell>
        </TableHeader>
        {({ item }) => (
          <TableRow onClick={() => openConditionEditor(item.facet)}>
            <TableRowCell>{item.facet}</TableRowCell>
            <TableRowCell>{Math.round(item.ccu)}</TableRowCell>
            <TableRowCell>{Math.round((Math.round(item.ccu)/Math.round(selectedAccount.ccu))*100)}%</TableRowCell>
          </TableRow>
        )}
      </Table>
    )
  }

  if (!topConditions && loading) {
    return (
      <div style={{ textAlign: 'center'}}>
        <h3>Loading</h3>
        <Spinner type={Spinner.TYPE.DOT}/>
      </div>
    )
  }


  if (!loading && topConditions && topConditions.length > 0) {
    return (
      <>
      {renderInstruction()}
      {renderConditionTable()}
      </>
    )
  }


  return <h2>No Conditions Consuming CCU Found!</h2>

};

export default CcuOptimization;
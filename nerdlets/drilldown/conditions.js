import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dropdown,
  DropdownItem,
  LineChart,
  PieChart,
  TableChart,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  TextField,
  Tooltip,
} from 'nr1';
import { Icon } from 'semantic-ui-react';
import {
  getConditions,
  getConditionTimeline,
  getTooltip,
  pluckTagValue,
} from '../shared/utils';
import ConditionTimeline from '../drilldown/condition-timeline';

const ConditionHistory = ({ selectedAccount, timeRange, policies }) => {
  const [policySearch, setPolicySearch] = useState('');
  const [conditions, setConditions] = useState(null);
  const [conditionSearch, setConditionSearch] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [conditionTimeline, setConditionTimeline] = useState(null);
  const drilldown = useRef(null);

  const fetchAndSetConditions = async (policy) => {
    setSelectedCondition(null);
    setSelectedPolicy(policy);
    let conditionResp = await getConditions(selectedAccount, policy, null);
    for (var i = 0; i < conditionResp.length; i++) {
      let id = pluckTagValue(conditionResp[i].tags, 'id');
      let type = pluckTagValue(conditionResp[i].tags, 'type');
      conditionResp[i].id = id;
      conditionResp[i].subType = type;
    }
    setConditions(conditionResp);
  };

  useEffect(() => {
    async function fetchTimeline() {
      const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;
      let timelines = await getConditionTimeline(
        selectedAccount,
        selectedCondition.id,
        timeClause
      );
      setConditionTimeline(timelines);
    }

    if (selectedCondition) {
      drilldown.current.scrollIntoView({ behavior: 'smooth' });
      fetchTimeline();
    }
  }, [selectedAccount, timeRange, policies, selectedCondition]);

  const renderPolicyDropdown = useMemo(() => {
    if (policies && policies.length > 0) {
      const filteredPolicies = policies.filter((p) => {
        return p.name.toLowerCase().includes(policySearch.toLowerCase());
      });

      return (
        <Dropdown
          label={<h5>Select a policy</h5>}
          labelInline
          title={selectedPolicy === null ? 'Policies' : selectedPolicy.name}
          items={filteredPolicies}
          search={policySearch}
          onSearch={(e) => setPolicySearch(e.target.value)}
        >
          {({ item }) => (
            <DropdownItem
              key={item.id}
              onClick={() => fetchAndSetConditions(item)}
            >
              {item.name}
            </DropdownItem>
          )}
        </Dropdown>
      );
    }
    return '';
  }, [selectedAccount, timeRange, policies, policySearch, selectedPolicy]);

  const renderConditionTable = useMemo(() => {
    if (selectedPolicy && conditions !== null) {
      if (conditions.length > 0) {
        const filteredConditions = conditions.filter((c) => {
          return c.name.toLowerCase().includes(conditionSearch.toLowerCase());
        });

        return (
          <div style={{ marginTop: '20px', marginBottom: '30px' }}>
            <TextField
              placeholder="Search conditions.."
              value={conditionSearch || ''}
              type={TextField.TYPE.SEARCH}
              onChange={(e) => setConditionSearch(e.target.value)}
            />
            <Table items={filteredConditions}>
              <TableHeader>
                <TableHeaderCell value={({ item }) => item.id}>
                  <b>ID</b>
                </TableHeaderCell>
                <TableHeaderCell value={({ item }) => item.name}>
                  <b>Name</b>
                </TableHeaderCell>
                <TableHeaderCell value={({ item }) => item.subType}>
                  <b>Type</b>
                </TableHeaderCell>
              </TableHeader>
              {({ item }) => (
                <TableRow onClick={() => setSelectedCondition(item)}>
                  <TableRowCell>{item.id}</TableRowCell>
                  <TableRowCell>{item.name}</TableRowCell>
                  <TableRowCell>{item.subType}</TableRowCell>
                </TableRow>
              )}
            </Table>
          </div>
        );
      }
      return (
        <h3>{`No conditions for policy: '${selectedPolicy.name}' found!`}</h3>
      );
    }

    return '';
  }, [selectedAccount, timeRange, selectedPolicy, conditions, conditionSearch]);

  const renderConditionDetail = useMemo(() => {
    if (selectedCondition !== null) {
      const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;
      return (
        <div id="drilldown" ref={drilldown}>
          <h3>
            {`Viewing Condition: `}
            <a
              href={selectedCondition.permalink}
              target="_blank"
              rel="noreferrer"
            >
              {selectedCondition.name}
            </a>
          </h3>
          <ConditionTimeline
            timeline={conditionTimeline}
            timeRange={timeRange}
          />
          <div
            id="open-incidents"
            className="conditionCharts"
            style={{ marginRight: '50px' }}
          >
            <h4>
              <Tooltip
                text={getTooltip('cond_incidents')}
                placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
              >
                <Icon name="help circle" />
              </Tooltip>
              Open Incident Trend
            </h4>
            <LineChart
              style={{ display: 'inline-block' }}
              accountIds={[selectedAccount.accountId]}
              query={`FROM NrAiIncident SELECT count(*) as 'Open Incidents' where event = 'open' and conditionId = ${Number(
                selectedCondition.id
              )} ${timeClause} facet priority TIMESERIES MAX`}
              fullWidth
            />
          </div>
          <div id="signal-eval" className="conditionCharts">
            <h4>
              <Tooltip
                text={getTooltip('cond_signal')}
                placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
              >
                <Icon name="help circle" />
              </Tooltip>
              Signal Evaluation Errors
            </h4>
            <LineChart
              style={{ display: 'inline-block' }}
              accountIds={[selectedAccount.accountId]}
              query={`FROM NrAiSignal SELECT count(*) as 'Errors' where conditionId = ${Number(
                selectedCondition.id
              )} and error is not null facet error ${timeClause} TIMESERIES`}
              fullWidth
            />
          </div>
          <br />
          <div style={{ marginTop: '15px' }}>
            <div
              id="entity-violation"
              className="conditionCharts"
              style={{ marginRight: '50px' }}
            >
              <h4>
                <Tooltip
                  text={getTooltip('cond_entities')}
                  placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
                >
                  <Icon name="help circle" />
                </Tooltip>
                Top 50 Violating Entities
              </h4>
              <PieChart
                style={{ display: 'inline-block' }}
                accountIds={[selectedAccount.accountId]}
                query={`FROM NrAiIncident SELECT count(*) where event = 'open' and conditionId = ${Number(
                  selectedCondition.id
                )} facet if(entity.guid = '' or entity.guid is null, targetName, entity.name) as 'entity' ${timeClause} LIMIT 50`}
                fullWidth
              />
            </div>
            <div id="audit-history" className="conditionCharts">
              <h4>
                <Tooltip
                  text={getTooltip('cond_audit')}
                  placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
                >
                  <Icon name="help circle" />
                </Tooltip>
                Condition Audit History
              </h4>
              <TableChart
                style={{ display: 'inline-block' }}
                accountIds={[selectedAccount.accountId]}
                query={`FROM NrAuditEvent SELECT actionIdentifier as 'Action', actorEmail as 'User', description as 'Change' where actionIdentifier like '%alerts.condition%' and description like '%${selectedCondition.name}%' ${timeClause} LIMIT 100`}
                fullWidth
              />
            </div>
          </div>
        </div>
      );
    }
    return '';
  }, [
    selectedAccount,
    timeRange,
    policies,
    selectedCondition,
    conditionTimeline,
    selectedPolicy,
  ]);

  return (
    <>
      {renderPolicyDropdown}
      {selectedPolicy === null ? '' : renderConditionTable}
      {selectedCondition === null ? '' : renderConditionDetail}
    </>
  );
};

ConditionHistory.propTypes = {
  selectedAccount: PropTypes.object,
  timeRange: PropTypes.object,
  policies: PropTypes.array,
};

export default ConditionHistory;

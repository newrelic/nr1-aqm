import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Card, Icon, Statistic } from 'semantic-ui-react';
import Workflows from './workflows';
import Destinations from './destinations';
import Issues from './issues';
import { MAX_CONCURRENCY } from '../shared/constants';
import {
  chunkData,
  getCardColor,
  getTooltip,
  generateDayChunks,
  getIssues,
  getNotifications,
  getWorkflows,
  getDestinations,
  getDestinationRelationships,
} from '../shared/utils';
import { PlatformStateContext, Spinner, Tooltip } from 'nr1';
import async from 'async';

const fetchWorkflows = async (account) => {
  let data = await getWorkflows(account, null);
  let predicateGroupings = [];
  let noChannelsAttached = [];

  data.forEach((obj) => {
    if (
      obj.destinationConfigurations === null ||
      obj.destinationConfigurations === undefined ||
      obj.destinationConfigurations?.length === 0
    ) {
      noChannelsAttached.push(obj);
    }
    const predicateString = JSON.stringify(obj.issuesFilter.predicates);
    let existingGroup = predicateGroupings.find(
      (group) => group.uniqueFilter === predicateString
    );
    if (!existingGroup) {
      existingGroup = { uniqueFilter: predicateString, matchingWorkflows: [] };
      predicateGroupings.push(existingGroup);
    }
    existingGroup.matchingWorkflows.push({
      name: obj.name,
      id: obj.id,
      guid: obj.guid,
    });
  });

  let duplicateWorkflows = predicateGroupings.filter(
    (p) => p.matchingWorkflows.length > 1
  );
  let dupeCount = 0;
  duplicateWorkflows.forEach((group) => {
    dupeCount += group.matchingWorkflows.length;
    group.uniqueFilter = JSON.parse(group.uniqueFilter);
  });

  let percentDuplicates = (dupeCount / data.length) * 100;
  let percentNoChannels = (noChannelsAttached.length / data.length) * 100;

  let final = {
    allWorkflows: data,
    duplicateWorkflows: duplicateWorkflows,
    noChannels: noChannelsAttached,
    noChannelsPercent: percentNoChannels.toFixed(2),
    dupePercent: percentDuplicates.toFixed(2),
  };
  return final;
};

const fetchNotificationsAndIssues = async (account, timeRange) => {
  let issueTimeRange = {
    start: Date.now() - timeRange.duration,
    end: Date.now(),
  }; //GraphQL fetching only
  let nrqlTimeRanges = await generateDayChunks(timeRange, Date.now());

  let issues = await getIssues(account, null, issueTimeRange);

  let notificationsQ = async.queue(async (task, cb) => {
    const notificationSet = await getNotifications(
      task.account,
      task.timeWindow
    );

    cb(null, notificationSet);
  }, MAX_CONCURRENCY);

  let allNotifications = [];

  const notificationProm = new Promise((resolve) => {
    notificationsQ.drain(() => {
      resolve(allNotifications);
    });
  });

  if (typeof nrqlTimeRanges === 'string') {
    notificationsQ.push(
      { account: account, timeWindow: nrqlTimeRanges },
      (err, result) => {
        if (err) {
          console.debug(`Error fetching notifications`);
          console.debug(err);
          return;
        }
        allNotifications.push(result);
      }
    );
  } else {
    nrqlTimeRanges.forEach((timeWindow) => {
      notificationsQ.push(
        { account: account, timeWindow: timeWindow },
        (err, result) => {
          if (err) {
            console.debug(`Error fetching notifications`);
            console.debug(err);
            return;
          }
          allNotifications.push(result);
        }
      );
    });
  }

  let allResults = await notificationProm;
  let flattened = allResults.flat();

  const timePickerDate = new Date(Date.now() - timeRange.duration).valueOf();

  const unsentIssues = issues.filter((i) => {
    return (
      !flattened.includes(i.issueId) && Number(i.activatedAt) > timePickerDate
    );
  });

  const unsentPercent = (unsentIssues.length / issues.length) * 100;
  const final = {
    unsentIssues: unsentIssues,
    unsentPercent: unsentPercent.toFixed(2),
  };
  return final;
};

const fetchDestinations = async (account) => {
  let dests = await getDestinations(account, null);
  let destChunks = await chunkData(dests, 25);

  const destinationsQ = async.queue(async (task, cb) => {
    const destRels = await getDestinationRelationships(task.guids);

    cb(null, destRels);
  }, MAX_CONCURRENCY);

  let processed = [];

  const destDrain = new Promise((resolve) => {
    destinationsQ.drain(() => {
      resolve(processed);
    });
  });

  for (let d = 0; d < destChunks.length; d++) {
    let formattedGuids = destChunks[d]
      .map((dest) => `"${dest.guid}"`)
      .join(',');
    destinationsQ.push({ guids: formattedGuids }, (err, result) => {
      if (err) {
        console.debug(`Error processing destination chunks`);
        console.debug(err);
        return;
      }
      processed.push(result);
    });
  }

  const allResults = await destDrain;
  const flattened = allResults.flat();
  const allDests = destChunks.flat();

  let unusedDestinations = flattened.filter((f) => {
    return f.relatedEntities.results.length === 0;
  });

  for (let z = 0; z < unusedDestinations.length; z++) {
    let matchingObj = allDests.find(
      (a) => a.guid === unusedDestinations[z].guid
    );
    if (matchingObj) {
      if (matchingObj.type == 'EMAIL') {
        unusedDestinations[z].name = matchingObj.properties[0].value;
      }
      unusedDestinations[z].destinationId = matchingObj.id;
      unusedDestinations[z].destinationType = matchingObj.type;
    }
  }

  const unusedPercent = (unusedDestinations.length / flattened.length) * 100;

  const final = {
    allDestinations: flattened,
    unusedDestinations: unusedDestinations,
    unusedPercent: unusedPercent.toFixed(2),
  };
  return final;
};

const Notifications = ({ selectedAccount }) => {
  const { timeRange } = useContext(PlatformStateContext);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState(null);
  const [workflows, setWorkflows] = useState(null);
  const [destinations, setDestinations] = useState(null);
  const [selectedCard, setSelectedCard] = useState('unsent_issues');

  useEffect(() => {
    const fetchAndSetData = async () => {
      setLoading(true);
      const [i, w, d] = await Promise.all([
        fetchNotificationsAndIssues(selectedAccount, timeRange),
        fetchWorkflows(selectedAccount),
        fetchDestinations(selectedAccount),
      ]);
      setIssues(i);
      setWorkflows(w);
      setDestinations(d);
      setLoading(false);
    };

    fetchAndSetData();
  }, [selectedAccount, timeRange]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h3>Loading</h3>
        <Spinner type={Spinner.TYPE.DOT} />
      </div>
    );
  }

  if (
    !loading &&
    issues !== null &&
    workflows !== null &&
    destinations !== null
  ) {
    return (
      <div id="drilldown">
        <Card.Group
          style={{ textAlign: 'center' }}
          id="card-group"
          itemsPerRow={3}
        >
          <Card
            color={getCardColor(Number(issues.unsentPercent))}
            onClick={() => setSelectedCard('unsent_issues')}
          >
            <Card.Header>
              <h3>
                <Tooltip
                  text={getTooltip('unsent_issues')}
                  placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
                >
                  <Icon name="help circle" />
                </Tooltip>
                Unsent Issues
              </h3>
            </Card.Header>
            <Card.Content>
              <Statistic color={getCardColor(Number(issues.unsentPercent))}>
                <Statistic.Value>
                  {issues?.unsentPercent == 'NaN'
                    ? 0
                    : Number(issues.unsentPercent)}
                  %
                </Statistic.Value>
              </Statistic>
            </Card.Content>
          </Card>
          <Card
            color={getCardColor(Number(destinations.unusedPercent))}
            onClick={() => setSelectedCard('unused_dests')}
          >
            <Card.Header>
              <h3>
                <Tooltip
                  text={getTooltip('unused_dests')}
                  placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
                >
                  <Icon name="help circle" />
                </Tooltip>
                Unused Destinations
              </h3>
            </Card.Header>
            <Card.Content>
              <Statistic
                color={getCardColor(Number(destinations.unusedPercent))}
              >
                <Statistic.Value>
                  {Number(destinations.unusedPercent)}%
                </Statistic.Value>
              </Statistic>
            </Card.Content>
          </Card>
          <Card
            color={getCardColor(Number(workflows.dupePercent))}
            onClick={() => setSelectedCard('overlap_workflows')}
          >
            <Card.Header>
              <h3>
                <Tooltip
                  text={getTooltip('overlap_workflows')}
                  placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
                >
                  <Icon name="help circle" />
                </Tooltip>
                Overlapping Workflows
              </h3>
            </Card.Header>
            <Card.Content>
              <Statistic color={getCardColor(Number(workflows.dupePercent))}>
                <Statistic.Value>
                  {Number(workflows.dupePercent)}%
                </Statistic.Value>
              </Statistic>
            </Card.Content>
          </Card>
        </Card.Group>
        {selectedCard === 'unsent_issues' ? (
          <Issues selectedAccount={selectedAccount} issues={issues} />
        ) : (
          ''
        )}
        {selectedCard === 'unused_dests' ? (
          <Destinations
            selectedAccount={selectedAccount}
            destinations={destinations}
          />
        ) : (
          ''
        )}
        {selectedCard === 'overlap_workflows' ? (
          <Workflows workflows={workflows} />
        ) : (
          ''
        )}
      </div>
    );
  }

  return <h2>Error Fetching Data</h2>;
};

Notifications.propTypes = {
  selectedAccount: PropTypes.object,
};

export default Notifications;

import React from 'react';
import { PlatformStateContext, Spinner, Tooltip } from 'nr1';
import { Card, Icon, Statistic, Tab } from 'semantic-ui-react';
import { getCardColor, getDestinations, getDestinationRelationships, getIncidents, getIssues, getNotifications, getPolicies, getTooltip, getWorkflows } from '../shared/utils';
import Workflows from '../drilldown/workflows';
import Destinations from '../drilldown/destinations';
import Notifications from '../drilldown/notifications';
import Incidents from '../drilldown/incidents';
import ConditionHistory from '../drilldown/conditions';
import async from 'async';

export default class Drilldown extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      workflows: null,
      destinations: null,
      issues: null,
      incidents: null,
      policies: null,
      selectedCard: null,
    };

    this.MAX_CONCURRENCY = 25;
  }

  async componentDidMount() {
    await this.fetchAllData();
  }

  async fetchAllData() {
    const w = await this.fetchWorkflows();
    const d = await this.fetchDestinations();
    const n = await this.fetchNotificationsAndIssues()
    const i = await this.fetchIncidents();

    //let allData = await Promise.all([this.fetchWorkflows(), this.fetchDestinations(),this.fetchNotificationsAndIssues(), this.fetchIncidents()]);
    const p = await this.fetchPolicies();

    this.setState({
      workflows: w,
      destinations: d,
      issues: n,
      incidents: i,
      policies: p,
      loading: false
    });
  }

  chunkData(d, size) {
    return new Promise((resolve, reject) => {
      let chunked = d.reduceRight((r,i,_,s) => (r.push(s.splice(0,size)),r),[]);
      resolve(chunked)
    })
  }

  pluckTagValue(tags, keyToPluck) {
    let result = tags.find(t => t.key === keyToPluck);
    return result ? result.values[0] : null;
  }

  generateDayChunks(t, startTime) { //returns 1 day chunks to use in nrql since-until clauses for fetching issues over > 1 day period (more accurate)
    const { timeRange } = this.props;
    const ONE_DAY_MS = 86400000;
    let currentStartTime = startTime - t;
    let dayChunks = [];

    if (t > 86400000) {
      for (let i=0; i<t; i += ONE_DAY_MS) {
        let currentEndTime = currentStartTime + ONE_DAY_MS;
        dayChunks.push({since: currentStartTime, until: currentEndTime});
        currentStartTime = currentEndTime;
      }
      return dayChunks;
    } else {
      return `SINCE ${timeRange.duration / 60000} minutes ago`; // if you have > 10k notifications in 1 day within a given account, do better.
    }
  }

  async fetchPolicies() {
    const { account } = this.props;
    let start = new Date(Date.now());

    const data = await getPolicies(account, null);
    return data;
  }

  async fetchIncidents() {
    const { account, timeRange } = this.props;
    let start = new Date(Date.now());

    const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;
    const data = await getIncidents(account, timeClause);

    return data;
  }

  async fetchNotificationsAndIssues() {
    const { account, timeRange } = this.props;

    let issueTimeRange = {'start': Date.now() - timeRange.duration, 'end': Date.now()}; //GraphQL fetching only
    let nrqlTimeRanges = await this.generateDayChunks(timeRange.duration, Date.now());

    let issues = await getIssues(account, null, issueTimeRange);
    let notificationsQ = async.queue(async (task, cb) => {
      const notificationSet = await getNotifications(task.account, task.timeWindow);

      cb(null, notificationSet);
    }, this.MAX_CONCURRENCY);

    let allNotifications = [];

    const notificationProm = new Promise(resolve => {
      notificationsQ.drain(() => {
        resolve(allNotifications);
      });
    });

    if (typeof nrqlTimeRanges === 'string') {
      notificationsQ.push({account: account, timeWindow: nrqlTimeRanges}, (err, result) => {
        if (err) {
          console.debug(`Error fetching notifications`);
          console.debug(err);
          return;
        }
        allNotifications.push(result);
      });
    } else {
      nrqlTimeRanges.forEach(timeWindow => {
        notificationsQ.push({account: account, timeWindow: timeWindow}, (err, result) => {
          if (err) {
            console.debug(`Error fetching notifications`);
            console.debug(err);
            return;
          }
          allNotifications.push(result);
        });
      });
    }

    let allResults = await notificationProm;
    let flattened = allResults.flat();

    const timePickerDate = new Date(Date.now() - timeRange.duration).valueOf();

    const unsentIssues = issues.filter(i => {
      // let issueId = this.pluckTagValue(i.tags, 'issueId');
      // let openTime = this.pluckTagValue(i.tags, 'activatedAt');
      return (!flattened.includes(i.issueId) && Number(i.activatedAt) > timePickerDate);
    });

    // for (let u=0; u<unsentIssues.length; u++) {
    //   const id = this.pluckTagValue(unsentIssues[u].tags, 'issueId');
    //   const policyName = this.pluckTagValue(unsentIssues[u].tags, 'policyName');
    //   const conditionName = this.pluckTagValue(unsentIssues[u].tags, 'conditionName');
    //   const priority = this.pluckTagValue(unsentIssues[u].tags, 'priority');
    //   const mutingState = this.pluckTagValue(unsentIssues[u].tags, 'mutingState');
    //
    //   unsentIssues[u].issueId = id;
    //   unsentIssues[u].policyName = policyName;
    //   unsentIssues[u].conditionName = conditionName;
    //   unsentIssues[u].priority = priority;
    //   unsentIssues[u].mutingState = mutingState;
    // }

    const unsentPercent = (unsentIssues.length/issues.length)*100
    const final = {'unsentIssues': unsentIssues, 'unsentPercent': unsentPercent.toFixed(2)};
    return final;
  }


  async fetchDestinations() {
    const { account } = this.props;

    let dests = await getDestinations(account, null);
    let destChunks = await this.chunkData(dests, 25);

    const destinationsQ = async.queue(async (task, cb) => {
      const destRels = await getDestinationRelationships(task.guids);

      cb(null, destRels);
    }, this.MAX_CONCURRENCY);

    let processed = [];

    const destDrain = new Promise(resolve => {
      destinationsQ.drain(() => {
        resolve(processed);
      })
    })

    for (let d=0; d<destChunks.length; d++) {
      let formattedGuids = destChunks[d].map(dest => `"${dest.guid}"`).join(",");
      destinationsQ.push({guids: formattedGuids}, (err, result) => {
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

    let unusedDestinations = flattened.filter(f => {
      return f.relatedEntities.results.length === 0;
    });

    for (let z=0; z<unusedDestinations.length; z++) {
      let matchingObj = allDests.find(a => a.guid === unusedDestinations[z].guid);
      if (matchingObj) {
        if (matchingObj.type == 'EMAIL') {
          unusedDestinations[z].name = matchingObj.properties[0].value;
        }
        unusedDestinations[z].destinationId = matchingObj.id;
        unusedDestinations[z].destinationType = matchingObj.type;
      }
    }

    const unusedPercent = (unusedDestinations.length/flattened.length)*100

    const final = {'allDestinations': flattened, 'unusedDestinations': unusedDestinations, 'unusedPercent': unusedPercent.toFixed(2)};
    return final;
  }

  async fetchWorkflows() {
    const { account } = this.props;

    let data = await getWorkflows(account, null);
    let predicateGroupings = [];
    let noChannelsAttached = [];

    data.forEach(obj => {
      if (obj.destinationConfigurations === null || obj.destinationConfigurations === undefined || obj.destinationConfigurations?.length === 0) {
        noChannelsAttached.push(obj);
      }
      const predicateString = JSON.stringify(obj.issuesFilter.predicates);
      let existingGroup = predicateGroupings.find(group => group.uniqueFilter === predicateString);
      if (!existingGroup) {
        existingGroup = { uniqueFilter: predicateString, matchingWorkflows: []};
        predicateGroupings.push(existingGroup);
      }
      existingGroup.matchingWorkflows.push({'name': obj.name, 'id': obj.id, 'guid': obj.guid});
    });

    let duplicateWorkflows = predicateGroupings.filter(p => p.matchingWorkflows.length > 1);
    let dupeCount = 0;
    duplicateWorkflows.forEach(group => {
      dupeCount += group.matchingWorkflows.length;
      group.uniqueFilter = JSON.parse(group.uniqueFilter);
    });

    let percentDuplicates = (dupeCount/data.length)*100
    let percentNoChannels = (noChannelsAttached.length/data.length)*100

    let final = {'allWorkflows': data, 'duplicateWorkflows': duplicateWorkflows, 'noChannels': noChannelsAttached, 'noChannelsPercent': percentNoChannels.toFixed(2), 'dupePercent': percentDuplicates.toFixed(2)};
    return final;
  }

  renderOverview() {
    const { workflows, destinations, issues, incidents } = this.state;
    return (
      <div id="drilldown">
        <Card.Group style={{textAlign: 'center'}} id="card-group" itemsPerRow={5}>
          <Card color={getCardColor(Number(incidents.under5Summary))} onClick={() => this.setState({selectedCard: 'flapping_incidents'})}>
            <Card.Header>
              <h3>
              <Tooltip
                text={getTooltip('flapping_incidents')}
                placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
              >
              <Icon name="help circle" />
              </Tooltip>
              Flapping Incidents
              </h3>
            </Card.Header>
            <Card.Content>
              <Statistic color={getCardColor(Number(incidents.under5Summary))} size="small">
                <Statistic.Value>{incidents.under5Summary == undefined ? 0 : Number(incidents.under5Summary)}%</Statistic.Value>
              </Statistic>
            </Card.Content>
          </Card>
          <Card color={getCardColor(Number(incidents.over1Summary))} onClick={() => this.setState({selectedCard: 'long_incidents'})}>
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
              <Statistic color={getCardColor(Number(incidents.over1Summary))} size="small">
                <Statistic.Value>{incidents.over1Summary == undefined ? 0 : Number(incidents.over1Summary)}%</Statistic.Value>
              </Statistic>
            </Card.Content>
          </Card>
          <Card color={getCardColor(Number(issues.unsentPercent))} onClick={() => this.setState({selectedCard: 'unsent_issues'})}>
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
              <Statistic color={getCardColor(Number(issues.unsentPercent))} size="small">
                <Statistic.Value>{issues?.unsentPercent == 'NaN' ? 0 : Number(issues.unsentPercent)}%</Statistic.Value>
              </Statistic>
            </Card.Content>
          </Card>
          <Card color={getCardColor(Number(destinations.unusedPercent))} onClick={() => this.setState({selectedCard: 'unused_dests'})}>
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
              <Statistic color={getCardColor(Number(destinations.unusedPercent))} size="small">
                <Statistic.Value>{Number(destinations.unusedPercent)}%</Statistic.Value>
              </Statistic>
            </Card.Content>
          </Card>
          <Card color={getCardColor(Number(workflows.dupePercent))} onClick={() => this.setState({selectedCard: 'overlap_workflows'})}>
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
              <Statistic color={getCardColor(Number(workflows.dupePercent))} size="small">
                <Statistic.Value>{Number(workflows.dupePercent)}%</Statistic.Value>
              </Statistic>
            </Card.Content>
          </Card>
        </Card.Group>
      </div>
    );

    // <Card color={getCardColor(Number(workflows.noChannelsPercent))}>
    //   <Card.Header>
    //     <h3>
    //     <Tooltip
    //       text={getTooltip('no_channels')}
    //       placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
    //     >
    //     <Icon name="help circle" />
    //     </Tooltip>
    //     Workflows (No Channels)
    //     </h3>
    //   </Card.Header>
    //   <Card.Content>
    //     <Statistic color={getCardColor(Number(workflows.noChannelsPercent))} size="small">
    //       <Statistic.Value>{Number(workflows.noChannelsPercent)}%</Statistic.Value>
    //     </Statistic>
    //   </Card.Content>
    // </Card>
  }


  renderCardDrilldown() {
    const { workflows, destinations, issues, incidents, selectedCard } = this.state;
    const { account, timeRange } = this.props;

    switch (selectedCard) {
      case 'flapping_incidents':
        return <Incidents selectedAccount={account} timeRange={timeRange} incidents={incidents} selectedCard={selectedCard}/>;
        break;
      case 'long_incidents':
        return <Incidents selectedAccount={account} timeRange={timeRange} incidents={incidents} selectedCard={selectedCard}/>;
        break;
      case 'unsent_issues':
        return <Notifications selectedAccount={account} issues={issues}/>;
        break;
      case 'unused_dests':
        return <Destinations selectedAccount={account} destinations={destinations}/>;
        break;
      // case 'no_channels':
      //   return <Workflows selectedAccount={account} workflows={workflows}/>;
      //   break;
      case 'overlap_workflows':
        return <Workflows selectedAccount={account} workflows={workflows}/>;
        break;
    }

  }

  render() {
    const { loading, workflows, destinations, issues, incidents, policies, selectedCard} = this.state;

    const panes = [
      {
        menuItem: 'Overview',
        render: () => (
          <Tab.Pane>
            {this.renderOverview()}
            &nbsp;&nbsp;&nbsp;
            {selectedCard === null ? '' : this.renderCardDrilldown()}
          </Tab.Pane>
        )
      },
      {
        menuItem: 'Condition History',
        render: () => (
          <Tab.Pane>
            <ConditionHistory selectedAccount={this.props.account} timeRange={this.props.timeRange} policies={policies}/>
          </Tab.Pane>
        )
      }
    ];

    if (loading) {
      return (
        <div style={{ textAlign: 'center'}}>
          <h3>Loading</h3>
          <Spinner type={Spinner.TYPE.DOT}/>
        </div>
      )
    }

    return <Tab panes={panes}/>
  }
}

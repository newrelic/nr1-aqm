import { NerdGraphQuery } from 'nr1';

export const getConditionTimeline = async (account, conditionId, timeClause) => {
  let critical = `FROM NrAiIncident SELECT uniques(timestamp, 3000) as 'critical_times' where event = 'open' and priority = 'critical' and conditionId = ${conditionId} ${timeClause}`;
  let warning = `FROM NrAiIncident SELECT uniques(timestamp, 3000) as 'warning_times' where event = 'open' and priority = 'warning' and conditionId = ${conditionId} ${timeClause}`;
  let muted  = `FROM NrAiIncident SELECT uniques(timestamp, 3000) as 'muted_times' where event = 'open' and muted is true and conditionId = ${conditionId} ${timeClause}`;

  const gql =  `
  {
    actor {
      criticalTimestamps: nrql(accounts: [${account.accountId}], query: "${critical}", timeout: 120) {results}
      warningTimestamps: nrql(accounts: [${account.accountId}], query: "${warning}", timeout: 120) {results}
      mutedTimestamps: nrql(accounts: [${account.accountId}], query: "${muted}", timeout: 120) {results}
    }
  }`;

  let data = await NerdGraphQuery.query({
    query: gql
  });

  const result = data?.data?.actor;
  const all = {'warning': result?.warningTimestamps?.results[0]?.warning_times, 'critical': result?.criticalTimestamps?.results[0]?.critical_times, 'muted': result?.mutedTimestamps?.results[0]?.muted_times }
  return all;

}

export const getEntities = async (account, cursor) => { //TODO: add relatedEntities call once entity-condition relationships exist (to fetch all entities + alert coverage -- # of conditions targeting entities + what specific conditions)
  let gql = ``;
  if (cursor == null) {
    gql = `
    {
      actor {
        entitySearch(query: "accountId = ${account.accountId} and reporting='true' and type not in ('DASHBOARD', 'WORKFLOW', 'CONDITION', 'DESTINATION', 'SECURE_CRED', 'ENDPOINT', 'ISSUE', 'POLICY', 'MONITOR_DOWNTIME', 'KEY_TRANSACTION', 'AWSLAMBDAREGION', 'AWSUSAGE', 'PRIVATE_LOCATION', 'CONTAINER')") {
          results {
            entities {
              type
              name
              guid
              alertSeverity
              accountId
            }
            nextCursor
          }
        }
      }
    }
    `;
  } else {
    gql = `
    {
      actor {
        entitySearch(query: "accountId = ${account.accountId} and reporting='true' and type not in ('DASHBOARD', 'WORKFLOW', 'CONDITION', 'DESTINATION', 'SECURE_CRED', 'ENDPOINT', 'ISSUE', 'POLICY', 'MONITOR_DOWNTIME', 'KEY_TRANSACTION', 'AWSLAMBDAREGION', 'AWSUSAGE', 'PRIVATE_LOCATION', 'CONTAINER')") {
          results(cursor: "${cursor}") {
            entities {
              type
              name
              guid
              alertSeverity
              accountId
            }
            nextCursor
          }
        }
      }
    }
    `;
  }

  const data = await NerdGraphQuery.query({
    query: gql
  });

  if (data.error) {
    console.debug(`Error fetching entities`);
    console.debug(data.error);
    return null;
  }

  let result = data?.data?.actor?.entitySearch?.results?.entities;
  let nextCursor = data?.data?.actor?.entitySearch?.results?.nextCursor;

  if (nextCursor == null) {
    return result;
  } else {
    const nextResult = await getEntities(account, nextCursor);
    return result.concat(nextResult);
  }
}

export const getPolicies = async (account, cursor) => {
  let gql = ``;
  if (cursor == null) {
    gql = `
    {
      actor {
        account(id: ${account.accountId}) {
          alerts {
            policiesSearch {
              policies {
                id
                name
              }
              nextCursor
            }
          }
        }
      }
    }
    `;
  } else {
    gql = `
    {
      actor {
        account(id: ${account.accountId}) {
          alerts {
            policiesSearch(cursor: "${cursor}") {
              policies {
                id
                name
              }
              nextCursor
            }
          }
        }
      }
    }
    `;
  }

  const data = await NerdGraphQuery.query({
    query: gql
  });

  if (data.error) {
    console.debug(`Error fetching policies`);
    console.debug(data.error);
    return null;
  }

  let result = data?.data?.actor?.account?.alerts?.policiesSearch?.policies;
  let nextCursor = data?.data?.actor?.account?.alerts?.policiesSearch?.nextCursor;

  if (nextCursor == null) {
    return result;
  } else {
    const nextResult = await getPolicies(account, nextCursor);
    return result.concat(nextResult);
  }
}

//TODO: switch to parity Alerts {} GQL once product fully consolidates all condition types to NRQL (no GQL endpoints that contain all condition config detail today)
export const getConditions = async (account, policy, cursor) => {
  let gql = ``;
  if (cursor == null) {
    gql = `
    {
      actor {
        entitySearch(
          query: "accountId=${account.accountId} and type='CONDITION' and tags.policyId='${policy.id}'"
        ) {
          results {
            entities {
              name
              permalink
              type
              tags {
                key
                values
              }
            }
            nextCursor
          }
        }
      }
    }
    `;
  } else {
    gql = `
    {
      actor {
        entitySearch(
          query: "accountId=${account.accountId} and type='CONDITION' and tags.policyId='${policy.id}'"
        ) {
          results(cursor:"${cursor}") {
            entities {
              name
              permalink
              type
              tags {
                key
                values
              }
            }
            nextCursor
          }
        }
      }
    }
    `;
  }

  const data = await NerdGraphQuery.query({
    query: gql
  });


  if (data.error) {
    console.debug(`Error fetching conditions`);
    console.debug(data.error);
    return null;
  }
  let result = data?.data?.actor?.entitySearch?.results?.entities;
  let nextCursor = data?.data?.actor?.entitySearch?.results?.nextCursor;

  if (nextCursor == null) {
    return result;
  } else {
    const nextResult = await getConditions(account, policy, nextCursor);
    return result.concat(nextResult);
  }
}

export const getCardColor = (cardValue) => {
  if (cardValue < 25 || isNaN(cardValue) || cardValue == undefined) {
    return 'green';
  }

  if (cardValue >= 25 && cardValue < 50) {
    return 'orange';
  }

  if (cardValue >= 50) {
    return 'red';
  }
}

export const getTooltip = (context) => {
  let text = '';
  switch (context) {
    case 'flapping_incidents':
      text = 'The percentage of incidents that are open for less than 5 minutes.';
      break;
    case 'long_incidents':
      text = 'The percentage of incidents that are open for longer than 1 day.';
      break;
    case 'unsent_issues':
      text = 'The percentage of issues that did not route to any destinations (no notifications sent).';
      break;
    case 'unused_dests':
      text = 'The percentage of destinations that are not attached to any workflows.';
      break;
    case 'overlap_workflows':
      text = 'The percentage of workflows with duplicate filters.';
      break;
    case 'no_channels':
      text = 'The percentage of workflows with no destinations (channels) attached. This often stems from removing workflows or channels via API/Terraform.';
      break;
    case 'cond_incidents':
      text = 'The trend of open incidents over the time period selected.';
      break;
    case 'cond_signal':
      text = 'The trend of errors when evaluating the signal exhibited over the time period selected.';
      break;
    case 'cond_entities':
      text = 'The top 50 entities that have violated the selected condition over the time period selected.';
      break;
    case 'cond_audit':
      text = 'A list of any changes made to the condition over the time period selected.';
      break;
    case 'entity_coverage':
      text = 'The percentage of entities that do not have alert conditions attached.';
      break;
  }
  return text;
}

export const getAlertCounts = async (timeClause, account) => {
    const notificationsQ = `FROM NrAiNotification SELECT count(*) ${timeClause}`;
    const issuesQ = `FROM NrAiIssue SELECT uniqueCount(issueId) as 'issueCount' where event in ('activate', 'close') ${timeClause}`;
    const gql =  `
    {
      actor {
        notificationCount: nrql(accounts: [${account.id}], query: "${notificationsQ}", timeout: 90) {results}
        issueCount: nrql(accounts: [${account.id}], query: "${issuesQ}", timeout: 90) {results}
      }
    }`;

    let data = await NerdGraphQuery.query({
      query: gql
    });

    const result = data?.data?.actor;
    const counts = {'accountId': account.id, 'accountName': account.name, 'notificationCount': result?.notificationCount?.results[0]?.count, 'issueCount': result?.issueCount?.results[0]?.issueCount }
    return counts;
};

export const getWorkflows = async (account, cursor) => {
  let gql = ``;
  if (cursor == null) {
    gql = `
    {
      actor {
        account(id: ${account.accountId}) {
          aiWorkflows {
            workflows {
              entities {
                guid
                lastRun
                accountId
                destinationConfigurations {
                  channelId
                  name
                  type
                }
                name
                workflowEnabled
                issuesFilter {
                  name
                  predicates {
                    attribute
                    operator
                    values
                  }
                }
              }
              nextCursor
            }
          }
        }
      }
      }
    `;
  } else {
    gql = `
    {
      actor {
        account(id: ${account.accountId}) {
          aiWorkflows {
            workflows(cursor: "${cursor}") {
              entities {
                guid
                lastRun
                accountId
                destinationConfigurations {
                  channelId
                  name
                  type
                }
                name
                workflowEnabled
                issuesFilter {
                  name
                  predicates {
                    attribute
                    operator
                    values
                  }
                }
              }
              nextCursor
            }
          }
        }
      }
      }
    `;
  }

  const data = await NerdGraphQuery.query({
    query: gql,
    fetchPolicyType: NerdGraphQuery.FETCH_POLICY_TYPE.NO_CACHE
  });


  if (data.error) {
    console.debug(`Error fetching workflows`);
    console.debug(data.error);
    return null;
  }
  let result = data?.data?.actor?.account?.aiWorkflows?.workflows?.entities;
  let nextCursor = data?.data?.actor?.account?.aiWorkflows?.workflows?.nextCursor;

  if (nextCursor == null) {
    return result;
  } else {
    const nextResult = await getWorkflows(account, nextCursor);
    return result.concat(nextResult);
  }
};

export const getDestinations = async (account, cursor) => {
  let gql = ``;
  if (cursor == null) {
    gql = `
    {
      actor {
        account(id: ${account.accountId}) {
          aiNotifications {
            destinations {
              entities {
                status
                type
                active
                id
                guid
                properties {
                  key
                  value
                }
                lastSent
              }
              nextCursor
            }
          }
        }
      }
    }
    `;
  } else {
    gql = `
    {
      actor {
        account(id: ${account.accountId}) {
          aiNotifications {
            destinations(cursor: "${cursor}") {
              entities {
                status
                type
                active
                id
                guid
                properties {
                  key
                  value
                }
                lastSent
              }
              nextCursor
            }
          }
        }
      }
    }
    `;
  }

  const data = await NerdGraphQuery.query({
    query: gql,
    fetchPolicyType: NerdGraphQuery.FETCH_POLICY_TYPE.NO_CACHE
  });

  if (data.error) {
    console.debug(`Error fetching destinations`);
    console.debug(data.error);
    return null;
  }

  let result = data?.data?.actor?.account?.aiNotifications?.destinations?.entities;
  let nextCursor = data?.data?.actor?.account?.aiNotifications?.destinations?.nextCursor;

  if (nextCursor == null) {
    return result;
  } else {
    const nextResult = await getDestinations(account, nextCursor);
    return result.concat(nextResult);
  }
}

export const getDestinationRelationships = async (guids) => { //max 25 guids per call
  const gql = `
    {
    actor {
      entities(
        guids: [${guids}]
      ) {
        relatedEntities {
          results {
            target {
              entity {
                name
                type
              }
            }
          }
        }
        guid
        name
        type
      }
    }
  }
  `;

  const data = await NerdGraphQuery.query({
    query: gql
  });

  if (data.error) {
    console.debug(`Error fetching destination relationships`);
    console.debug(data.error);
    return null;
  }

  let result = data?.data?.actor?.entities;
  return result;
}

export const getNotifications = async (account, sinceClause) => {
  let notificationIds = null;
  if (typeof sinceClause === 'string') {
    notificationIds = `WITH aparse(issueLink, 'https://radar-api.service.newrelic.com/accounts/%/issues/*?%') as id FROM NrAiNotification SELECT uniques(id, 10000) as 'notifications' ${sinceClause}`;
  } else {
    notificationIds = `WITH aparse(issueLink, 'https://radar-api.service.newrelic.com/accounts/%/issues/*?%') as id FROM NrAiNotification SELECT uniques(id, 10000) as 'notifications' since ${sinceClause.since} until ${sinceClause.until}`;
  }

  const gql =  `
  {
    actor {
      notifications: nrql(accounts: [${account.accountId}], query: "${notificationIds}", timeout: 120) {results}
    }
  }`;

  let data = await NerdGraphQuery.query({
    query: gql
  });

  const result = data?.data?.actor?.notifications?.results[0]?.notifications;
  return result;
}

// export const getIssuesAndNotifications = async (account, sinceClause) => {
//   let issueIds = null;
//   let notificationIds = null;
//   if (typeof sinceClause === 'string') {
//     issueIds = `FROM NrAiIssue SELECT uniques(issueId, 10000) as 'issues' where event in ('activate', 'close') ${sinceClause}`;
//     notificationIds = `WITH aparse(issueLink, 'https://radar-api.service.newrelic.com/accounts/%/issues/*?%') as id FROM NrAiNotification SELECT uniques(id, 10000) as 'notifications' ${sinceClause}`;
//   } else {
//     issueIds = `FROM NrAiIssue SELECT uniques(issueId, 10000) as 'issues' where event in ('activate', 'close') since ${sinceClause.since} until ${sinceClause.until}`;
//     notificationIds = `WITH aparse(issueLink, 'https://radar-api.service.newrelic.com/accounts/%/issues/*?%') as id FROM NrAiNotification SELECT uniques(id, 10000) as 'notifications' since ${sinceClause.since} until ${sinceClause.until}`;
//   }
//
//   const gql =  `
//   {
//     actor {
//       issues: nrql(accounts: [${account.accountId}], query: "${issueIds}", timeout: 120) {results}
//       notifications: nrql(accounts: [${account.accountId}], query: "${notificationIds}", timeout: 120) {results}
//     }
//   }`;
//
//   let data = await NerdGraphQuery.query({
//     query: gql
//   });
//
//   const final = {'notifications': data?.data?.actor?.notifications?.results[0]?.notifications, 'issues': data?.data?.actor?.issues?.results[0]?.issues};
//   return final;
// }

export const getIssues = async (account, cursor, timeWindow) => { //GraphQL pagination is very slow over long time ranges // NRQL times out at long time ranges with uniques()-facet combos + wouldn't be fully accurate
  let gql = ``;
  if (cursor == null) {
    // gql = `
    // {
    //   actor {
    //     entitySearch(query: "type='ISSUE' and tags.accountId=${account.accountId}") {
    //       results {
    //         entities {
    //           name
    //           tags {
    //             key
    //             values
    //           }
    //         }
    //         nextCursor
    //       }
    //     }
    //   }
    // }
    // `;

    gql = `
    {
      actor {
        account(id: ${account.accountId}) {
          aiIssues {
            issues(filter: {states: [ACTIVATED]}
            timeWindow: {endTime: ${timeWindow.end}, startTime: ${timeWindow.start}}
            ) {
              issues {
                conditionName
                issueId
                policyName
                title
                activatedAt
                closedAt
                eventType
              }
              nextCursor
            }
          }
        }
      }
    }
    `;
  } else {
    // gql = `
    // {
    //   actor {
    //     entitySearch(query: "type='ISSUE' and tags.accountId=${account.accountId}") {
    //       results(cursor: "${cursor}") {
    //         entities {
    //           name
    //           tags {
    //             key
    //             values
    //           }
    //         }
    //         nextCursor
    //       }
    //     }
    //   }
    // }
    // `;
    gql = `
    {
      actor {
        account(id: ${account.accountId}) {
          aiIssues {
            issues(filter: {states: [ACTIVATED]}
              cursor: "${cursor}"
              timeWindow: {endTime: ${timeWindow.end}, startTime: ${timeWindow.start}}
            ) {
              issues {
                conditionName
                issueId
                policyName
                title
                activatedAt
                closedAt
                eventType
              }
              nextCursor
            }
          }
        }
      }
    }
    `;
  }

  const data = await NerdGraphQuery.query({
    query: gql
  });


  if (data.error) {
    console.debug(`Error fetching issues`);
    console.debug(data.error);
    return null;
  }
  // let result = data?.data?.actor?.entitySearch?.results?.entities;
  // let nextCursor = data?.data?.actor?.entitySearch?.results?.nextCursor;
  let result = data?.data?.actor?.account?.aiIssues?.issues?.issues;
  let nextCursor = data?.data?.actor?.account?.aiIssues?.issues?.nextCursor;

  if (nextCursor == null) {
    return result;
  } else {
    const nextResult = await getIssues(account, nextCursor, timeWindow);
    return result.concat(nextResult);
  }
}

export const getIncidents = async (account, timeClause) => {
  const underFiveSummaryQ = `FROM NrAiIncident SELECT percentage(count(*),WHERE durationSeconds <= 300) as 'percentUnder5' WHERE event = 'close' ${timeClause}`;
  const underFiveDrilldownQ = `FROM NrAiIncident SELECT percentage(count(*),WHERE durationSeconds <= 300) as 'percentUnder5' WHERE event = 'close' facet policyName, conditionName LIMIT 100 ${timeClause}`;
  const overDaySummaryQ = `FROM NrAiIncident SELECT percentage(count(*),WHERE durationSeconds >= 86400) as 'percentOverADay' WHERE event = 'close' ${timeClause}`;
  const overDayDrilldownQ = `FROM NrAiIncident SELECT percentage(count(*),WHERE durationSeconds >= 86400) as 'percentOverADay' WHERE event = 'close' facet policyName, conditionName LIMIT 100 ${timeClause}`;

  const gql =  `
  {
    actor {
      under5Summary: nrql(accounts: [${account.accountId}], query: "${underFiveSummaryQ}", timeout: 120) {results}
      under5Drilldown: nrql(accounts: [${account.accountId}], query: "${underFiveDrilldownQ}", timeout: 120) {results}
      over1Summary: nrql(accounts: [${account.accountId}], query: "${overDaySummaryQ}", timeout: 120) {results}
      over1Drilldown: nrql(accounts: [${account.accountId}], query: "${overDayDrilldownQ}", timeout: 120) {results}
    }
  }`;

  let data = await NerdGraphQuery.query({
    query: gql
  });

  const result = data?.data?.actor;
  const all = {'under5Summary': result?.under5Summary?.results[0]?.percentUnder5?.toFixed(2), 'under5Drilldown': result?.under5Drilldown?.results, 'over1Summary': result?.over1Summary?.results[0]?.percentOverADay?.toFixed(2), 'over1Drilldown': result?.over1Drilldown?.results }
  return all;
}

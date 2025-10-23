import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  AccountsQuery,
  Button,
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
import { Icon, Modal } from 'semantic-ui-react';
import { getAlertCounts, getTooltip } from '../shared/utils';
import { MAX_CONCURRENCY } from '../shared/constants';
import async from 'async';
import Drilldown from './drilldown';
import Filter from './filter';

const TABS = {
  ALERTS: 0,
  NOTIFICATIONS: 1,
  ENTITY_COVERAGE: 2,
  CONDITION_HISTORY: 3,
  CCU_OPTIMIZATION: 4,
};

const OverviewPage = () => {
  const [fetchingData, setFetchingData] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [tableData, setTableData] = useState([]);
  const [column, setColumn] = useState(0);
  const [sortingType, setSortingType] = useState(
    TableHeaderCell.SORTING_TYPE.NONE
  );
  const [openDrilldown, setOpenDrilldown] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [currentFilterSelections, setCurrentFilterSelections] = useState([]);
  const [appliedFilterSelections, setAppliedFilterSelections] = useState([]);
  const [currentTab, setCurrentTab] = useState(TABS.ALERTS);

  const { timeRange } = useContext(PlatformStateContext);

  useEffect(() => {
    const fetchData = async () => {
      const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;
      const table = await getData(timeClause);
      const sortedTable = table.sort(
        (a, b) => b.notificationCount - a.notificationCount
      );
      await setTableData(sortedTable);
      setFetchingData(false);
    };

    fetchData();
  }, [timeRange]);

  const getData = async (timeClause) => {
    const accounts = await AccountsQuery.query();
    if (accounts.error) {
      console.debug(accounts.error);
      return null;
    } else {
      const dataQueue = async.queue(async (task, cb) => {
        const data = await getAlertCounts(task.timeClause, task.acct);

        cb(null, data);
      }, MAX_CONCURRENCY);

      let processed = [];

      const drainProm = new Promise((resolve) => {
        dataQueue.drain(() => {
          resolve(processed);
        });
      });

      accounts.data.forEach((acct) => {
        dataQueue.push(
          { timeClause: timeClause, acct: acct },
          (err, result) => {
            if (err) {
              console.debug(`Error processing account: ` + acct.id);
              console.debug(err);
              return;
            }
            processed.push(result);
          }
        );
      });
      return await drainProm;
    }
  };

  const handleTabChange = (event, data) => {
    setCurrentTab(data.activeIndex);
  };

  const isFilterDisabled = useMemo(() => {
    return (
      currentTab === TABS.NOTIFICATIONS ||
      currentTab === TABS.CONDITION_HISTORY ||
      currentTab === TABS.CCU_OPTIMIZATION
    );
  }, [currentTab]);

  const onClose = () => {
    setOpenDrilldown(false);
    setSelectedAccount(null);
    setCurrentFilterSelections([]);
    setAppliedFilterSelections([]);
    setCurrentTab(TABS.ALERTS);
  };

  const filtersHaveChanged = useMemo(() => {
    return (
      JSON.stringify(currentFilterSelections) !==
      JSON.stringify(appliedFilterSelections)
    );
  }, [currentFilterSelections, appliedFilterSelections]);

  const handleApplyFilters = () => {
    setAppliedFilterSelections(currentFilterSelections);
  };

  const _onClickHeader = (nextCol, { nextSortingType }) => {
    if (nextCol === column) {
      setSortingType(nextSortingType);
    } else {
      setSortingType(nextSortingType);
      setColumn(nextCol);
    }
  };

  const _onClickTableRow = (item) => {
    setOpenDrilldown(true);
    setSelectedAccount(item);
  };

  if (fetchingData) {
    return (
      <div className="loader">
        <h3>Loading</h3>
        <Spinner type={Spinner.TYPE.DOT} />
      </div>
    );
  }

  if (!fetchingData && tableData.length > 0) {
    const filteredTable = tableData.filter((t) =>
      t.accountName.toLowerCase().includes(searchText.toLowerCase())
    );
    return (
      <>
        {selectedAccount !== null ? (
          <Modal
            size="fullscreen"
            open={openDrilldown}
            onClose={onClose}
            closeIcon
            className="modal"
          >
            <Modal.Header>
              <div className="drilldown-header">
                <h2>Drilldown - {selectedAccount.accountName}</h2>
                <Filter
                  account={selectedAccount.accountId}
                  selections={currentFilterSelections}
                  setSelections={setCurrentFilterSelections}
                  isDisabled={isFilterDisabled}
                />
                <div className="filter-button">
                  <Button
                    onClick={handleApplyFilters}
                    disabled={!filtersHaveChanged || isFilterDisabled}
                    variant={Button.VARIANT.PRIMARY}
                    sizeType={Button.SIZE_TYPE.SMALL}
                  >
                    Apply Filter
                  </Button>
                  <Tooltip
                    text={getTooltip('filter')}
                    placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
                  >
                    <Icon name="help circle" />
                  </Tooltip>
                </div>
              </div>
            </Modal.Header>
            <Modal.Content scrolling>
              <Drilldown
                account={selectedAccount}
                filters={appliedFilterSelections}
                activeIndex={currentTab}
                onTabChange={handleTabChange}
              />
            </Modal.Content>
          </Modal>
        ) : (
          ''
        )}
        <TextField
          placeholder="Search accounts..."
          value={searchText || ''}
          type={TextField.TYPE.SEARCH}
          onChange={(e) => setSearchText(e.target.value)}
        />
        &nbsp;&nbsp;&nbsp;
        <Table items={filteredTable}>
          <TableHeader>
            <TableHeaderCell
              value={({ item }) => item.accountId}
              sortable
              sortingOrder={3}
              sortingType={
                column === 3 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
              }
              onClick={(evt, data) => _onClickHeader(3, data)}
            >
              <b>Account ID</b>
            </TableHeaderCell>
            <TableHeaderCell
              value={({ item }) => item.accountName}
              sortable
              sortingOrder={0}
              sortingType={
                column === 0 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
              }
              onClick={(evt, data) => _onClickHeader(0, data)}
            >
              <b>Account Name</b>
            </TableHeaderCell>
            <TableHeaderCell
              value={({ item }) => item.notificationCount}
              sortable
              sortingOrder={1}
              sortingType={
                column === 1 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
              }
              onClick={(evt, data) => _onClickHeader(1, data)}
            >
              <b># Notifications</b>
            </TableHeaderCell>
            <TableHeaderCell
              value={({ item }) => item.issueCount}
              sortable
              sortingOrder={2}
              sortingType={
                column === 2 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
              }
              onClick={(evt, data) => _onClickHeader(2, data)}
            >
              <b># Issues</b>
            </TableHeaderCell>
            <TableHeaderCell
              value={({ item }) => item.ccu}
              sortable
              sortingOrder={4}
              sortingType={
                column === 4 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
              }
              onClick={(evt, data) => _onClickHeader(4, data)}
            >
              <b># CCUs</b>
            </TableHeaderCell>
            <TableHeaderCell
              value={({ item }) => item.ccuPercent}
              sortable
              sortingOrder={5}
              sortingType={
                column === 5 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
              }
              onClick={(evt, data) => _onClickHeader(5, data)}
            >
              <b>% CCU vs Total</b>
            </TableHeaderCell>
          </TableHeader>
          {({ item }) => (
            <TableRow onClick={() => _onClickTableRow(item)}>
              <TableRowCell>{item.accountId}</TableRowCell>
              <TableRowCell>{item.accountName}</TableRowCell>
              <TableRowCell>{item.notificationCount}</TableRowCell>
              <TableRowCell>{item.issueCount}</TableRowCell>
              <TableRowCell>{item.ccu ? Math.round(item.ccu) : 0}</TableRowCell>
              <TableRowCell>
                {item.ccuPercent ? Math.round(item.ccuPercent) : 0}%
              </TableRowCell>
            </TableRow>
          )}
        </Table>
      </>
    );
  }

  return <h2>No Data Found</h2>;
};

export default OverviewPage;

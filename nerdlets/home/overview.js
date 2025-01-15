import React, { useState, useEffect, useContext } from 'react';
import {
  AccountsQuery,
  PlatformStateContext,
  Spinner,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  TextField,
} from 'nr1';
import { Modal } from 'semantic-ui-react';
import { getAlertCounts } from '../shared/utils';
import { MAX_CONCURRENCY } from '../shared/constants';
import async from 'async';
import Drilldown from './drilldown';

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

  const onClose = () => {
    setOpenDrilldown(false);
    setSelectedAccount(null);
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
              Drilldown - {selectedAccount.accountName}
            </Modal.Header>
            <Modal.Content scrolling>
              <Drilldown account={selectedAccount} />
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
          </TableHeader>
          {({ item }) => (
            <TableRow onClick={() => _onClickTableRow(item)}>
              <TableRowCell>{item.accountId}</TableRowCell>
              <TableRowCell>{item.accountName}</TableRowCell>
              <TableRowCell>{item.notificationCount}</TableRowCell>
              <TableRowCell>{item.issueCount}</TableRowCell>
            </TableRow>
          )}
        </Table>
      </>
    );
  }

  return <h2>No Data Found</h2>;
};

export default OverviewPage;

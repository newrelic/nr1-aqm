import React from 'react';
import { AccountsQuery, PlatformStateContext, Popover, Spinner, Table, TableHeader, TableHeaderCell, TableRow, TableRowCell, TextField } from 'nr1';
import { Modal } from 'semantic-ui-react';
import { getAlertCounts } from '../shared/utils';
import async from 'async';
import Drilldown from './drilldown';

export default class OverviewPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fetchingData: true,
      searchText: '',
      tableData: [],
      column: 0,
      sortingType: TableHeaderCell.SORTING_TYPE.NONE,
      openDrilldown: false,
      selectedAccount: null
    };

    this.MAX_CONCURRENCY = 25;
  }

  async componentDidMount() {
    const { timeRange } = this.props;
    const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;

    const table = await this.getData(timeClause);
    let sortedTable = await table.sort((a,b) => b.notificationCount - a.notificationCount); //default sorting by accountName

    this.setState({
      tableData: sortedTable,
      fetchingData: false
    });
  }

  async componentDidUpdate(prevProps) {
    const { timeRange } = this.props;
    if (timeRange.duration !== prevProps.timeRange.duration) {
      await this.setState({ fetchingData: true });
      const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;

      const table = await this.getData(timeClause);
      let sortedTable = await table.sort((a,b) => b.notificationCount - a.notificationCount); //default sorting by accountName

      this.setState({
        tableData: sortedTable,
        fetchingData: false
      });
    }
  }

  async getData() {
    const { timeRange } = this.props;
    const accounts = await AccountsQuery.query();
    if (accounts.error) {
      console.debug(accounts.error);
      return null;
    } else {
      const dataQueue = async.queue(async (task, cb) => {
        const data = await getAlertCounts(task.timeClause, task.acct);
        //console.log(data);

        cb(null, data);
      }, this.MAX_CONCURRENCY);

      let processed = [];

      const drainProm = new Promise(resolve => {
        dataQueue.drain(() => {
          resolve(processed);
        })
      })

      accounts.data.forEach(acct => {
        const timeClause = `SINCE ${timeRange.duration / 60000} minutes ago`;
        dataQueue.push({timeClause: timeClause, acct: acct}, (err, result) => {
          if (err) {
            console.debug(`Error processing account: ` + acct.id);
            console.debug(err);
            return;
          }
          processed.push(result);
        });
      })

      return await drainProm;

    } //else
  }

  onClose() {
    this.setState({
      openDrilldown: false,
      selectedAccount: null
    })
  };

  _onClickHeader(nextCol, {nextSortingType}) {
    const { column } = this.state;
    if (nextCol === column) {
      this.setState({sortingType: nextSortingType});
    } else {
      this.setState({
        sortingType: nextSortingType,
        column: nextCol
      })
    }
  };

  _onClickTableRow(item) {
    this.setState({
      openDrilldown: true,
      selectedAccount: item
    })
  };

  render() {
    const { column, fetchingData, openDrilldown, tableData, searchText, selectedAccount, sortingType } = this.state;
    const { timeRange } = this.props;

    const filteredTable = tableData.filter(t => t.accountName.toLowerCase().includes(searchText.toLowerCase()));

    if (!fetchingData && tableData.length > 0) {
      return (
        <>
          {selectedAccount !== null ?
            <Modal
              size='fullscreen'
              open={openDrilldown}
              onClose={() => this.onClose()}
              closeIcon
              className="modal"
            >
            <Modal.Header>Drilldown - {selectedAccount.accountName}</Modal.Header>
            <Modal.Content scrolling>
              <Drilldown account={selectedAccount} timeRange={timeRange}/>
            </Modal.Content>
            </Modal>
            :
            ''
          }
          <TextField
            placeholder='Search accounts...'
            value={searchText || ''}
            type={TextField.TYPE.SEARCH}
            onChange={e => this.setState({searchText: e.target.value})}
          />
          &nbsp;&nbsp;&nbsp;
          <Table items={filteredTable}>
            <TableHeader>
              <TableHeaderCell
                value={({ item }) => item.accountId}
                sortable
                sortingOrder={3}
                sortingType={column === 3 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE}
                onClick={(evt, data) => this._onClickHeader(3, data)}
              >
              <b>Account ID</b>
              </TableHeaderCell>
              <TableHeaderCell
                value={({ item }) => item.accountName}
                sortable
                sortingOrder={0}
                sortingType={column === 0 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE}
                onClick={(evt, data) => this._onClickHeader(0, data)}
              >
              <b>Account Name</b>
              </TableHeaderCell>
              <TableHeaderCell
                value={({ item }) => item.notificationCount}
                sortable
                sortingOrder={1}
                sortingType={column === 1 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE}
                onClick={(evt, data) => this._onClickHeader(1, data)}
              >
              <b># Notifications</b>
              </TableHeaderCell>
              <TableHeaderCell
                value={({ item }) => item.issueCount}
                sortable
                sortingOrder={2}
                sortingType={column === 2 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE}
                onClick={(evt, data) => this._onClickHeader(2, data)}
              >
              <b># Issues</b>
              </TableHeaderCell>
            </TableHeader>
            {({ item }) => (
              <TableRow onClick={() => this._onClickTableRow(item)}>
                <TableRowCell>{item.accountId}</TableRowCell>
                <TableRowCell>{item.accountName}</TableRowCell>
                <TableRowCell>{item.notificationCount}</TableRowCell>
                <TableRowCell>{item.issueCount}</TableRowCell>
              </TableRow>
            )}
          </Table>
        </>
      )
    }

    if (fetchingData) {
      return (
        <div className="loader">
          <h3>Loading</h3>
          <Spinner type={Spinner.TYPE.DOT}/>
        </div>
      );
    }
  }
}

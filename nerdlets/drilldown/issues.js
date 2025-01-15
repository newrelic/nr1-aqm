import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import ExportButton from '../shared/export';
import {
  Link,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  TextField,
} from 'nr1';

const Issues = ({ selectedAccount, issues }) => {
  const [searchText, setSearchText] = useState('');

  if (issues.unsentIssues.length > 0) {
    return useMemo(() => {
      const headers = [
        { label: 'ID', ref: 'issueId' },
        { label: 'Policy', ref: 'policyName' },
        { label: 'Condition', ref: 'conditionName' },
        { label: 'Title', ref: 'title' },
      ];

      const filtered = issues.unsentIssues.filter((i) => {
        return (
          i.policyName[0].toLowerCase().includes(searchText.toLowerCase()) ||
          i.conditionName[0].toLowerCase().includes(searchText.toLowerCase()) ||
          i.title[0].toLowerCase().includes(searchText.toLowerCase())
        );
      });

      return (
        <>
          <TextField
            placeholder="Search issues.."
            value={searchText || ''}
            type={TextField.TYPE.SEARCH}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ marginTop: '20px' }}
          />
          <ExportButton
            data={filtered}
            type="unsent_issues"
            filename={`unsent_issues.csv`}
            displayText="Export"
          />
          &nbsp;&nbsp;&nbsp;
          <Table items={filtered}>
            <TableHeader>
              {headers.map((h, i) => {
                return (
                  <TableHeaderCell key={i} value={({ item }) => item[h['ref']]}>
                    <b>{h.label}</b>
                  </TableHeaderCell>
                );
              })}
            </TableHeader>
            {({ item }) => (
              <TableRow>
                <TableRowCell>
                  <Link
                    to={`https://radar-api.service.newrelic.com/accounts/${selectedAccount.accountId.toString()}/issues/${
                      item.issueId
                    }?notifier=&action=`}
                  >
                    {item.issueId.substring(0, 8)}
                  </Link>
                </TableRowCell>
                <TableRowCell>{item.policyName[0]}</TableRowCell>
                <TableRowCell>{item.conditionName[0]}</TableRowCell>
                <TableRowCell>{item.title[0]}</TableRowCell>
              </TableRow>
            )}
          </Table>
        </>
      );
    }, [issues, searchText]);
  }

  return <h2>No Unsent Issues</h2>;
};

Issues.propTypes = {
  selectedAccount: PropTypes.object,
  issues: PropTypes.object,
};

export default Issues;

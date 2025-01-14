import React, { useMemo, useState } from 'react';
import { List, ListItem, navigation, Table, TableHeader, TableHeaderCell, TableRow, TableRowCell, TextField } from 'nr1';

const Workflows = ({workflows}) => {
  const [searchText, setSearchText] = useState('');

  const renderDuplicateWorkflows = () => {
    if (workflows?.duplicateWorkflows?.length > 0 && Number(workflows.dupePercent) > 0) {

      const filtered = workflows.duplicateWorkflows.filter(w => {
        return JSON.stringify(w).includes(searchText);
      });

      return (
        <>
          <TextField
            placeholder='Search workflows..'
            value={searchText || ''}
            type={TextField.TYPE.SEARCH}
            onChange={e => setSearchText(e.target.value)}
            style={{marginTop: '20px', marginBottom: '10px'}}
          />
          <table>
            <tr>
              <th><b>Common Filter(s)</b></th>
              <th><b>Workflows</b></th>
            </tr>
            {
              filtered.map(f => {
                return (
                  <tr>
                    <td>
                      {
                        f?.uniqueFilter?.length > 0
                        ?
                        f.uniqueFilter.map(filter => {
                          return (
                            <div>
                              <b>{`${filter.attribute} ${filter.operator} ${filter.values}`}</b>
                            </div>
                          );
                        })
                        :
                        'n/a'
                      }
                    </td>
                    <td>
                      {
                        f?.matchingWorkflows?.length > 0
                        ?
                        f.matchingWorkflows.map(w => {
                          return (
                            <div>
                              <a className="u-unstyledLink cell-link" href={`https://one.newrelic.com/redirect/entity/${w.guid}`} target="_blank" rel="noreferrer">{w.name}</a>
                            </div>
                          );
                        })
                        :
                        'n/a'
                      }
                    </td>
                  </tr>
                )
              })
            }
          </table>
        </>
      )
    }

    return <h2>No Overlapping Workflows</h2>;
  }

  if (workflows !== null) {
    return useMemo(() => {
      return (
        <>
        {renderDuplicateWorkflows()}
        </>
      )
    }, [workflows, searchText]);
  }

};

export default Workflows;

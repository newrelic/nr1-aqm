import React, { useMemo, useState } from 'react';
import { List, ListItem, navigation, Table, TableHeader, TableHeaderCell, TableRow, TableRowCell, TextField } from 'nr1';

//TODO:
//Style table like NR default component
//implement no_channels view when sample data available or replace with something better

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

      // return (
      //   <>
      //   <TextField
      //     placeholder='Search policy/condition..'
      //     value={searchText || ''}
      //     type={TextField.TYPE.SEARCH}
      //     onChange={e => setSearchText(e.target.value)}
      //     style={{marginTop: '20px'}}
      //   />
      //   <Table items={filtered}>
      //     <TableHeader>
      //       <TableHeaderCell
      //       value={({ item }) => item.uniqueFilter}
      //       >
      //       <b>Common Filter(s)</b>
      //       </TableHeaderCell>
      //       <TableHeaderCell
      //       value={({ item }) => item.matchingWorkflows}
      //       >
      //       <b>Workflows</b>
      //       </TableHeaderCell>
      //     </TableHeader>
      //     {({ item }) => (
      //       <TableRow id="row">
      //         <TableRowCell>
      //           {
      //             item?.uniqueFilter?.length > 0
      //             ?
      //             item.uniqueFilter.map(i => {
      //               return (
      //                 <>
      //                   <b>{`${i.attribute} ${i.operator} ${i.values}`}</b>
      //                   <br />
      //                 </>
      //               )
      //             })
      //             :
      //             'n/a'
      //           }
      //         </TableRowCell>
      //         <TableRowCell>
      //           <List rowHeight={16}>
      //             {
      //               item?.matchingWorkflows?.length > 0
      //               ?
      //               item.matchingWorkflows.map(w => {
      //                 return (
      //                   <ListItem>
      //                     <a className="u-unstyledLink cell-link">{w.name}</a>
      //                   </ListItem>
      //                 )
      //               })
      //               :
      //               'n/a'
      //             }
      //           </List>
      //         </TableRowCell>
      //       </TableRow>
      //     )}
      //   </Table>
      //   </>
      // )
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

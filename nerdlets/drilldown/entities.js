import React, { useMemo, useState } from 'react';
import { navigation, Table, TableHeader, TableHeaderCell, TableRow, TableRowCell, TextField } from 'nr1';

//TODO:
//Switch to entity-condition relationships via relatedEntities once available

const Entities = ({selectedAccount, entities}) => {
  const [searchText, setSearchText] = useState('');

  // const openEntityModal = (entityGuid) => { navigation.openStackedEntity(entityGuid); };

  if (entities.noAlerts.length > 0) {
    return useMemo(() => {
      const filtered = entities.noAlerts.filter(e => e.name.toLowerCase().includes(searchText.toLowerCase()));

      return (
        <>
        <TextField
          placeholder='Search entities..'
          value={searchText || ''}
          type={TextField.TYPE.SEARCH}
          onChange={e => setSearchText(e.target.value)}
          style={{marginTop: '20px'}}
        />
        <Table items={filtered}>
          <TableHeader>
            <TableHeaderCell
            value={({ item }) => item.name}
            >
            <b>Name</b>
            </TableHeaderCell>
            <TableHeaderCell
            value={({ item }) => item.type}
            >
            <b>Type</b>
            </TableHeaderCell>
          </TableHeader>
          {({ item }) => (
            <TableRow>
              <TableRowCell><a href={`https://one.newrelic.com/redirect/entity/${item.guid}`} target="_blank" rel="noreferrer">{item.name}</a></TableRowCell>
              <TableRowCell>{item.type}</TableRowCell>
            </TableRow>
          )}
        </Table>
        </>
      )
    }, [entities.noAlerts, searchText]);
  }

  return <h2>No Entities Missing Alerts!</h2>

};

export default Entities;

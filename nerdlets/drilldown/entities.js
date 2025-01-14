import React, { useEffect, useMemo, useState } from 'react';
import { getCardColor, getEntities, getTooltip } from '../shared/utils';
import ExportButton from '../shared/export';
import { Progress } from 'semantic-ui-react';
import { navigation, Table, TableHeader, TableHeaderCell, TableRow, TableRowCell, TextField, Spinner } from 'nr1';

<<<<<<< HEAD
const Entities = ({selectedAccount}) => {
  const [entities, setEntities] = useState(null);
  const [loading, setLoading] = useState(true);
=======
//TODO:
//Switch to entity-condition relationships via relatedEntities once available.

const Entities = ({selectedAccount, entities}) => {
>>>>>>> main
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const fetchAndSetEntities = async () => {
      setLoading(true);
      const data = await getEntities(selectedAccount, null);

      if (data == null) {
        setLoading(false);
        return;
      } else {
        const noAlerts = data.filter(e => {
          return e.alertSeverity == 'NOT_CONFIGURED';
        });

        const percentMissingAlerts = (noAlerts.length / data.length)*100

        setEntities({'allEntities': data, 'noAlerts': noAlerts, 'percentMissing': percentMissingAlerts.toFixed(2)});
        setLoading(false);
      }
    };

    fetchAndSetEntities();
  }, [selectedAccount])

  if (loading) {
    return (
      <div style={{ textAlign: 'center'}}>
        <h3>Loading</h3>
        <Spinner type={Spinner.TYPE.DOT}/>
      </div>
    );
  }

  if (!loading && entities && entities.noAlerts?.length > 0) {
    const filtered = entities.noAlerts.filter(e => e.name.toLowerCase().includes(searchText.toLowerCase()));
    return (
      <>
        <h5>{getTooltip('entity_coverage')}</h5>
        <Progress
          className={getCardColor(entities.percentMissing, 'progress')}
          total={entities.allEntities.length}
          value={entities.noAlerts.length}
          precision={2}
          percent={entities.percentMissing}
        />
        <TextField
          placeholder='Search entities..'
          value={searchText || ''}
          type={TextField.TYPE.SEARCH}
          onChange={e => setSearchText(e.target.value)}
          style={{marginTop: '10px'}}
        />
        <ExportButton
          data={filtered}
          type='entities'
          filename={`entities_no_alerts.csv`}
          displayText='Export'
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
  }

  return <h2>No Entities Missing Alerts!</h2>

};

export default Entities;

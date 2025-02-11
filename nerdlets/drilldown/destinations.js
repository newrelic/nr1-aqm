import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  navigation,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  TextField,
} from 'nr1';

const openDestinationEdit = (
  selectedAccount,
  destinationId,
  destinationType
) => {
  const destinationEdit = {
    id: 'notify.edit-destination',
    urlState: {
      accountId: selectedAccount.accountId,
      destinationId: destinationId,
      destinationType: destinationType,
    },
  };

  navigation.openStackedNerdlet(destinationEdit);
};

const Destinations = ({ selectedAccount, destinations }) => {
  const [searchText, setSearchText] = useState('');

  if (destinations.unusedDestinations.length > 0) {
    return useMemo(() => {
      const filtered = destinations.unusedDestinations.filter((d) =>
        d.name.toLowerCase().includes(searchText.toLowerCase())
      );

      return (
        <>
          <TextField
            placeholder="Search destinations.."
            value={searchText || ''}
            type={TextField.TYPE.SEARCH}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ marginTop: '20px' }}
          />
          <Table items={filtered}>
            <TableHeader>
              <TableHeaderCell value={({ item }) => item.name}>
                <b>Name</b>
              </TableHeaderCell>
              <TableHeaderCell value={({ item }) => item.destinationType}>
                <b>Type</b>
              </TableHeaderCell>
            </TableHeader>
            {({ item }) => (
              <TableRow
                onClick={() =>
                  openDestinationEdit(
                    selectedAccount,
                    item.destinationId,
                    item.destinationType
                  )
                }
              >
                <TableRowCell>{item.name}</TableRowCell>
                <TableRowCell>{item.destinationType}</TableRowCell>
              </TableRow>
            )}
          </Table>
        </>
      );
    }, [destinations, searchText]);
  }

  return <h2>No Unused Destinations</h2>;
};

Destinations.propTypes = {
  selectedAccount: PropTypes.object,
  destinations: PropTypes.object,
};

export default Destinations;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FilterBar } from '@newrelic/nr-labs-components';
import { Spinner } from 'nr1';
import { getFilterKeys, getFilterValues } from '../shared/utils';

// custom hook to dynamically fetch/cache values based on key selected
const useFetchValues = (accountId) => {
  const [cache, setCache] = useState({});

  const fetchValues = useCallback(
    async (key) => {
      if (cache[key]) return cache[key];

      const data = await getFilterValues(key, accountId);
      setCache((prev) => ({ ...prev, [key]: data }));
      return data;
    },
    [cache]
  );

  return fetchValues;
};

const Filter = ({ account, selections, setSelections, isDisabled }) => {
  const [filterOptions, setFilterOptions] = useState();
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const valueFetcher = useFetchValues(account);
  const lastSelectionRef = useRef([]);

  useEffect(() => {
    const fetchFilterKeys = async () => {
      setIsLoadingKeys(true);
      try {
        const optionsWithKeys = await getFilterKeys(account);
        setFilterOptions(optionsWithKeys);
      } catch (err) {
        console.error('Failed to fetch filter keys: ', err);
      } finally {
        setIsLoadingKeys(false);
      }
    };

    fetchFilterKeys();
  }, [account]);

  const triggerFetchValues = useCallback(
    async (key) => {
      const filterOption = filterOptions.find((opt) => opt.option === key);

      if (
        !filterOption ||
        filterOption.values.length > 0 ||
        filterOption.isLoading
      ) {
        return;
      }

      setFilterOptions((currentOptions) =>
        currentOptions.map((opt) =>
          opt.option === key
            ? {
                ...opt,
                isLoading: true,
                values: [{ value: 'Loading...', id: 'loading' }],
              }
            : opt
        )
      );

      const newValues = await valueFetcher(key);
      setFilterOptions((currentOptions) =>
        currentOptions.map((opt) =>
          opt.option === key
            ? { ...opt, isLoading: false, values: newValues }
            : opt
        )
      );
    },
    [filterOptions, valueFetcher]
  );

  const handleFilterChange = (newSelections) => {
    for (const newSelection of newSelections) {
      const oldSelection = lastSelectionRef.current.find(
        (c) => c.id === newSelection.id
      );
      if (newSelection.key && (!oldSelection || !oldSelection.key)) {
        triggerFetchValues(newSelection.key.value);
      }
    }

    setSelections(newSelections);
    lastSelectionRef.current = newSelections;
  };

  if (isLoadingKeys) return <Spinner />;

  return (
    <div className={`filters ${isDisabled ? 'disabled' : ''}`}>
      <FilterBar
        options={filterOptions}
        onChange={handleFilterChange}
        defaultSelections={selections}
        isDisabled={isDisabled}
      />
    </div>
  );
};

Filter.propTypes = {
  account: PropTypes.number,
  selections: PropTypes.array,
  setSelections: PropTypes.func,
  isDisabled: PropTypes.string,
};

export default Filter;

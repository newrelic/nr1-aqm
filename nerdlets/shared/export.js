import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'nr1';
import csvDownload from 'json-to-csv-export';

const ExportButton = ({ data, type, filename, displayText }) => {
  let headers;
  let formattedData = [];

  switch (type) {
    case 'short_incidents':
      headers = [
        { key: 'policyName', label: 'policy_name' },
        { key: 'conditionName', label: 'condition_name' },
        { key: 'percentUnder5', label: 'short_lived_incident_%' },
      ];
      if (data && data?.length > 0) {
        data.forEach((d) => {
          formattedData.push({
            policyName: d.facet[0],
            conditionName: d.facet[1],
            percentUnder5: d.percentUnder5.toFixed(2),
          });
        });
      }
      break;
    case 'long_incidents':
      headers = [
        { key: 'policyName', label: 'policy_name' },
        { key: 'conditionName', label: 'condition_name' },
        { key: 'percentOverADay', label: 'long_running_incident_%' },
      ];
      if (data && data?.length > 0) {
        data.forEach((d) => {
          formattedData.push({
            policyName: d.facet[0],
            conditionName: d.facet[1],
            percentOverADay: d.percentOverADay.toFixed(2),
          });
        });
      }
      break;
    case 'unsent_issues':
      headers = [
        { key: 'issueId', label: 'issue_id' },
        { key: 'policyName', label: 'policy_name' },
        { key: 'conditionName', label: 'condition_name' },
        { key: 'title', label: 'issue_title' },
      ];
      formattedData = data;
      break;
    case 'entities':
      headers = [
        { key: 'name', label: 'name' },
        { key: 'type', label: 'type' },
        { key: 'guid', label: 'guid' },
      ];
      formattedData = data;
      break;
  }

  return (
    <div className="exportBtn">
      <Button
        type={Button.TYPE.PRIMARY}
        iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EXPORT}
        onClick={() =>
          csvDownload({ data: formattedData, headers: headers, filename })
        }
      >
        {displayText}
      </Button>
    </div>
  );
};

ExportButton.propTypes = {
  data: PropTypes.array,
  type: PropTypes.string,
  filename: PropTypes.string,
  displayText: PropTypes.string,
};

export default ExportButton;

import React from 'react';
import styled from 'styled-components';

const DateContainer = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
`;

const DateGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: bold;
  color: #2c3e50;
`;

const DateInput = styled.input`
  padding: 8px 12px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const DateRangeSelector = ({ dateRange, onChange }) => {
  const handleStartDateChange = (e) => {
    onChange({
      ...dateRange,
      startDate: e.target.value
    });
  };

  const handleEndDateChange = (e) => {
    onChange({
      ...dateRange,
      endDate: e.target.value
    });
  };

  return (
    <DateContainer>
      <DateGroup>
        <Label>開始日</Label>
        <DateInput
          type="date"
          value={dateRange.startDate}
          onChange={handleStartDateChange}
        />
      </DateGroup>
      
      <DateGroup>
        <Label>終了日</Label>
        <DateInput
          type="date"
          value={dateRange.endDate}
          onChange={handleEndDateChange}
        />
      </DateGroup>
    </DateContainer>
  );
};

export default DateRangeSelector;
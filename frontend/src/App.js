import React, { useState } from 'react';
import styled from 'styled-components';
import FileUpload from './components/FileUpload';
import DateRangeSelector from './components/DateRangeSelector';
import ScheduleTable from './components/ScheduleTable';
import axios from 'axios';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Header = styled.h1`
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
  font-size: 2.5em;
`;

const Section = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Button = styled.button`
  background: #3498db;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: #2980b9;
  }

  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  background: #fadad7;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
`;

const SuccessMessage = styled.div`
  color: #27ae60;
  background: #d5f4e6;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
`;

function App() {
  const [doctorsData, setDoctorsData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '2025-01-15',
    endDate: '2025-02-15'
  });
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileUpload = (data) => {
    setDoctorsData(data);
    setSuccess('CSVファイルが正常にアップロードされました');
    setError('');
  };

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  const generateSchedule = async () => {
    if (!doctorsData) {
      setError('最初にCSVファイルをアップロードしてください');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/generate-schedule', {
        doctors: doctorsData,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      setSchedule(response.data);
      setSuccess('当直表が正常に生成されました');
    } catch (err) {
      setError(err.response?.data?.error || '当直表の生成中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>🏥 医師当直表生成システム</Header>
      
      <Section>
        <h2>📁 医師データのアップロード</h2>
        <FileUpload onFileUpload={handleFileUpload} />
        {doctorsData && (
          <div style={{ marginTop: '10px', color: '#27ae60' }}>
            ✅ {doctorsData.length}名の医師データを読み込みました
          </div>
        )}
      </Section>

      <Section>
        <h2>📅 期間設定</h2>
        <DateRangeSelector
          dateRange={dateRange}
          onChange={handleDateRangeChange}
        />
      </Section>

      <Section>
        <h2>⚡ 当直表生成</h2>
        <Button
          onClick={generateSchedule}
          disabled={!doctorsData || loading}
        >
          {loading ? '生成中...' : '当直表を生成'}
        </Button>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
      </Section>

      {schedule && (
        <Section>
          <h2>📋 生成された当直表</h2>
          <ScheduleTable schedule={schedule} />
        </Section>
      )}
    </Container>
  );
}

export default App;
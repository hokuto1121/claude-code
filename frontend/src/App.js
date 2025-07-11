import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/ja';

moment.locale('ja');

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`;

const Header = styled.h1`
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
`;

const Section = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const FileInput = styled.input`
  margin: 10px 0;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100%;
`;

const Button = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin: 5px;
  
  &:hover {
    background: #2980b9;
  }
  
  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const DateInput = styled.input`
  margin: 10px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: center;
  }
  
  th {
    background: #f8f9fa;
    font-weight: bold;
  }
  
  tr:nth-child(even) {
    background: #f8f9fa;
  }
`;

const ErrorMessage = styled.div`
  background: #e74c3c;
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
`;

const SuccessMessage = styled.div`
  background: #27ae60;
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 20px;
  color: #3498db;
`;

function App() {
  const [csvFile, setCsvFile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
    setError('');
  };

  const uploadCSV = async () => {
    if (!csvFile) {
      setError('CSVファイルを選択してください');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('csvFile', csvFile);

    try {
      const response = await axios.post('/api/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setDoctors(response.data.doctors);
      setSuccess(`${response.data.doctors.length}名の医師データを読み込みました`);
    } catch (err) {
      setError(err.response?.data?.error || 'CSVアップロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = async () => {
    if (!doctors.length || !startDate || !endDate) {
      setError('医師データと期間を設定してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/generate-schedule', {
        doctors,
        startDate,
        endDate
      });

      if (response.data.success) {
        setSchedule(response.data);
        setSuccess('当直表が正常に生成されました');
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'スケジュール生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!schedule) return;

    const csvHeaders = ['日付', '曜日', '祝日', '上当直', '下当直', '院内BU', '外来担当', '外来指導'];
    const csvData = [
      csvHeaders.join(','),
      ...schedule.schedule.map(day => [
        day.date,
        day.dayOfWeek,
        day.holiday,
        day.上当直,
        day.下当直,
        day.院内BU,
        day.外来担当,
        day.外来指導
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `当直表_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container>
      <Header>🏥 医師当直表生成システム</Header>
      
      <Section>
        <h3>1. CSVファイルアップロード</h3>
        <p>医師データ（氏名、グループ、定期外来日、不都合日）をCSV形式でアップロードしてください。</p>
        <FileInput
          type="file"
          accept=".csv"
          onChange={handleFileChange}
        />
        <Button onClick={uploadCSV} disabled={!csvFile || loading}>
          CSVアップロード
        </Button>
        
        {doctors.length > 0 && (
          <div>
            <h4>読み込み済み医師データ ({doctors.length}名)</h4>
            <ul>
              {doctors.slice(0, 5).map((doctor, index) => (
                <li key={index}>
                  {doctor.name} (グループ{doctor.group})
                </li>
              ))}
              {doctors.length > 5 && <li>...他{doctors.length - 5}名</li>}
            </ul>
          </div>
        )}
      </Section>

      <Section>
        <h3>2. 期間設定</h3>
        <div>
          <label>開始日: </label>
          <DateInput
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <label>終了日: </label>
          <DateInput
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </Section>

      <Section>
        <h3>3. 当直表生成</h3>
        <Button 
          onClick={generateSchedule} 
          disabled={!doctors.length || !startDate || !endDate || loading}
        >
          当直表を生成
        </Button>
        
        {schedule && (
          <Button onClick={downloadCSV}>
            CSV形式でダウンロード
          </Button>
        )}
      </Section>

      {loading && (
        <LoadingSpinner>
          処理中... ⏳
        </LoadingSpinner>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      {schedule && (
        <Section>
          <h3>4. 生成された当直表</h3>
          <p>期間: {startDate} ～ {endDate} ({schedule.totalDays}日間)</p>
          
          <Table>
            <thead>
              <tr>
                <th>日付</th>
                <th>曜日</th>
                <th>祝日</th>
                <th>上当直</th>
                <th>下当直</th>
                <th>院内BU</th>
                <th>外来担当</th>
                <th>外来指導</th>
              </tr>
            </thead>
            <tbody>
              {schedule.schedule.map((day, index) => (
                <tr key={index}>
                  <td>{moment(day.date).format('MM/DD')}</td>
                  <td>{day.dayOfWeek}</td>
                  <td>{day.holiday}</td>
                  <td>{day.上当直}</td>
                  <td>{day.下当直}</td>
                  <td>{day.院内BU}</td>
                  <td>{day.外来担当}</td>
                  <td>{day.外来指導}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <h4>点数集計</h4>
          <Table>
            <thead>
              <tr>
                <th>医師名</th>
                <th>グループ</th>
                <th>合計点数</th>
              </tr>
            </thead>
            <tbody>
              {schedule.pointsSummary.map((doctor, index) => (
                <tr key={index}>
                  <td>{doctor.name}</td>
                  <td>{doctor.group}</td>
                  <td>{doctor.points.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>
      )}
    </Container>
  );
}

export default App;
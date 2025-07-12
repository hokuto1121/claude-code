import React from 'react';
import styled from 'styled-components';

const TableContainer = styled.div`
  overflow-x: auto;
  margin-top: 20px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Th = styled.th`
  background: #34495e;
  color: white;
  padding: 12px;
  text-align: center;
  border: 1px solid #2c3e50;
  font-weight: bold;
`;

const Td = styled.td`
  padding: 10px;
  text-align: center;
  border: 1px solid #bdc3c7;
  background: ${props => {
    if (props.isHoliday) return '#ffeaa7';
    if (props.isSaturday) return '#e8f4f8';
    if (props.isSunday) return '#ffeaa7';
    return 'white';
  }};
`;

const DayTd = styled(Td)`
  font-weight: bold;
  background: ${props => {
    if (props.isHoliday) return '#fdcb6e';
    if (props.isSaturday) return '#74b9ff';
    if (props.isSunday) return '#fd79a8';
    return '#ddd';
  }};
  color: ${props => {
    if (props.isHoliday || props.isSunday) return '#2d3436';
    if (props.isSaturday) return 'white';
    return '#2d3436';
  }};
`;

const DownloadButton = styled.button`
  background: #27ae60;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 20px;

  &:hover {
    background: #2ecc71;
  }
`;

const StatsContainer = styled.div`
  background: #ecf0f1;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const StatsTitle = styled.h3`
  margin: 0 0 10px 0;
  color: #2c3e50;
`;

const StatsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 10px;
`;

const StatItem = styled.div`
  background: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
`;

const ScheduleTable = ({ schedule }) => {
  if (!schedule || !schedule.schedule) {
    return <div>スケジュールデータがありません</div>;
  }

  const downloadCSV = () => {
    const headers = ['日付', '曜日', '祝日', '上当直', '下当直', '院内BU', '外来担当', '外来指導'];
    const csvContent = [headers.join(',')];

    schedule.schedule.forEach(day => {
      const row = [
        day.date,
        day.dayOfWeek,
        day.holiday || '',
        day.assignments.upper || '',
        day.assignments.lower || '',
        day.assignments.inHospitalBU || '',
        day.assignments.outpatientDoctor || '',
        day.assignments.outpatientSupervisor || ''
      ];
      csvContent.push(row.join(','));
    });

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `duty_schedule_${schedule.schedule[0].date}_${schedule.schedule[schedule.schedule.length-1].date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDayType = (dayOfWeek, holiday) => {
    if (holiday) return { isHoliday: true };
    if (dayOfWeek === '土') return { isSaturday: true };
    if (dayOfWeek === '日') return { isSunday: true };
    return {};
  };

  return (
    <div>
      <DownloadButton onClick={downloadCSV}>
        📥 CSVダウンロード
      </DownloadButton>

      {schedule.stats && (
        <StatsContainer>
          <StatsTitle>📊 割り当て統計</StatsTitle>
          <StatsList>
            {Object.entries(schedule.stats).map(([doctorName, stats]) => (
              <StatItem key={doctorName}>
                <strong>{doctorName}</strong><br />
                合計点数: {stats.totalPoints.toFixed(1)}点<br />
                上当直: {stats.upper}回, 下当直: {stats.lower}回<br />
                院内BU: {stats.inHospitalBU}回, 外来: {stats.outpatient}回
              </StatItem>
            ))}
          </StatsList>
        </StatsContainer>
      )}

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th>日付</Th>
              <Th>曜日</Th>
              <Th>祝日</Th>
              <Th>上当直</Th>
              <Th>下当直</Th>
              <Th>院内BU</Th>
              <Th>外来担当</Th>
              <Th>外来指導</Th>
            </tr>
          </thead>
          <tbody>
            {schedule.schedule.map(day => {
              const dayProps = getDayType(day.dayOfWeek, day.holiday);
              return (
                <tr key={day.date}>
                  <Td {...dayProps}>{day.date}</Td>
                  <DayTd {...dayProps}>{day.dayOfWeek}</DayTd>
                  <Td {...dayProps}>{day.holiday || ''}</Td>
                  <Td {...dayProps}>{day.assignments.upper || ''}</Td>
                  <Td {...dayProps}>{day.assignments.lower || ''}</Td>
                  <Td {...dayProps}>{day.assignments.inHospitalBU || ''}</Td>
                  <Td {...dayProps}>{day.assignments.outpatientDoctor || ''}</Td>
                  <Td {...dayProps}>{day.assignments.outpatientSupervisor || ''}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default ScheduleTable;
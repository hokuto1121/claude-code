const moment = require('moment-timezone');

// 日本の祝日カレンダー (簡易版)
const holidays2024 = [
  '2024-01-01', '2024-01-08', '2024-02-11', '2024-02-12', '2024-02-23',
  '2024-03-20', '2024-04-29', '2024-05-03', '2024-05-04', '2024-05-05',
  '2024-07-15', '2024-08-11', '2024-09-16', '2024-09-23', '2024-10-14',
  '2024-11-03', '2024-11-04', '2024-11-23'
];

const holidays2025 = [
  '2025-01-01', '2025-01-13', '2025-02-11', '2025-02-23', '2025-03-20',
  '2025-04-29', '2025-05-03', '2025-05-04', '2025-05-05', '2025-07-21',
  '2025-08-11', '2025-09-15', '2025-09-23', '2025-10-13', '2025-11-03',
  '2025-11-23', '2025-12-23'
];

const allHolidays = [...holidays2024, ...holidays2025];

const isHoliday = (date) => {
  return allHolidays.includes(moment(date).format('YYYY-MM-DD'));
};

// 勤務点数計算
const calculatePoints = (role, dayType) => {
  const points = {
    平日: {
      上当直: 1.0,
      下当直: 0.5,
      亀当直: 1.0
    },
    土曜: {
      上当直: 2.0,
      下当直: 2.0,
      外来担当: 0.5,
      外来指導: 0.5,
      亀当直: 1.5,
      亀日直: 1.0
    },
    日祝: {
      上当直: 1.0,
      下当直: 0.5,
      亀当直: 1.5,
      亀日直: 1.5
    }
  };

  return points[dayType]?.[role] || 0;
};

// スケジュール生成メイン関数
const generateSchedule = (doctors, startDate, endDate) => {
  try {
    const schedule = [];
    const doctorStats = {};
    
    // 医師統計初期化
    doctors.forEach(doctor => {
      doctorStats[doctor.name] = {
        group: doctor.group,
        points: 0,
        lastAssignedDate: null,
        regularClinicDays: doctor.regularClinicDays,
        unavailableDays: doctor.unavailableDays
      };
    });

    const current = moment(startDate);
    const end = moment(endDate);

    while (current.isSameOrBefore(end)) {
      const dateStr = current.format('YYYY-MM-DD');
      const dayOfWeek = current.format('dddd');
      const isWeekend = current.day() === 0 || current.day() === 6;
      const isHol = isHoliday(dateStr);
      const isSaturday = current.day() === 6;
      const isThirdSaturday = isSaturday && Math.ceil(current.date() / 7) === 3;
      
      let dayType = '平日';
      if (isSaturday && !isHol) dayType = '土曜';
      if (current.day() === 0 || isHol) dayType = '日祝';

      const daySchedule = {
        date: dateStr,
        dayOfWeek: dayOfWeek,
        holiday: isHol ? '祝日' : '',
        上当直: '',
        下当直: '',
        院内BU: '',
        外来担当: '',
        外来指導: ''
      };

      // 利用可能な医師を取得
      const getAvailableDoctors = (groups, excludeRecent = true) => {
        return doctors.filter(doctor => {
          if (!groups.includes(doctor.group)) return false;
          
          // 不都合日チェック
          if (doctor.unavailableDays.includes(dateStr)) return false;
          
          // 定期外来日の前日チェック
          const tomorrow = moment(current).add(1, 'day').format('YYYY-MM-DD');
          if (doctor.regularClinicDays.includes(tomorrow)) return false;
          
          // 最近の勤務からの間隔チェック
          if (excludeRecent && doctorStats[doctor.name].lastAssignedDate) {
            const daysDiff = current.diff(moment(doctorStats[doctor.name].lastAssignedDate), 'days');
            if (daysDiff < 1) return false;
          }
          
          return true;
        });
      };

      // 上当直割り当て (グループ①②)
      const availableForUpper = getAvailableDoctors(['①', '②']);
      if (availableForUpper.length > 0) {
        // 点数が最も低い医師を選択
        const sortedByPoints = availableForUpper.sort((a, b) => 
          doctorStats[a.name].points - doctorStats[b.name].points
        );
        const selectedDoctor = sortedByPoints[0];
        daySchedule.上当直 = selectedDoctor.name;
        
        // 点数加算
        const points = calculatePoints('上当直', dayType);
        doctorStats[selectedDoctor.name].points += points;
        doctorStats[selectedDoctor.name].lastAssignedDate = dateStr;

        // 院内BU追加 (上当直がグループ②の場合)
        if (selectedDoctor.group === '②') {
          const availableForBU = getAvailableDoctors(['①']).filter(d => d.name !== selectedDoctor.name);
          if (availableForBU.length > 0) {
            const sortedBU = availableForBU.sort((a, b) => 
              doctorStats[a.name].points - doctorStats[b.name].points
            );
            const buDoctor = sortedBU[0];
            daySchedule.院内BU = buDoctor.name;
            doctorStats[buDoctor.name].points += 0.5; // 仮の点数
            doctorStats[buDoctor.name].lastAssignedDate = dateStr;
          }
        }
      }

      // 下当直割り当て (グループ③)
      const availableForLower = getAvailableDoctors(['③']);
      if (availableForLower.length > 0) {
        const sortedByPoints = availableForLower.sort((a, b) => 
          doctorStats[a.name].points - doctorStats[b.name].points
        );
        const selectedDoctor = sortedByPoints[0];
        daySchedule.下当直 = selectedDoctor.name;
        
        const points = calculatePoints('下当直', dayType);
        doctorStats[selectedDoctor.name].points += points;
        doctorStats[selectedDoctor.name].lastAssignedDate = dateStr;
      }

      // 土曜外来 (第3土曜除く)
      if (isSaturday && !isThirdSaturday && !isHol) {
        const availableForClinic = getAvailableDoctors(['①', '②'], false);
        
        if (availableForClinic.length >= 2) {
          const sortedByPoints = availableForClinic.sort((a, b) => 
            doctorStats[a.name].points - doctorStats[b.name].points
          );
          
          // 外来担当
          daySchedule.外来担当 = sortedByPoints[0].name;
          doctorStats[sortedByPoints[0].name].points += calculatePoints('外来担当', dayType);
          
          // 外来指導 (別の医師)
          if (sortedByPoints.length > 1) {
            daySchedule.外来指導 = sortedByPoints[1].name;
            doctorStats[sortedByPoints[1].name].points += calculatePoints('外来指導', dayType);
          }
        }
      }

      schedule.push(daySchedule);
      current.add(1, 'day');
    }

    // 点数統計の計算
    const pointsSummary = Object.entries(doctorStats).map(([name, stats]) => ({
      name,
      group: stats.group,
      points: stats.points
    }));

    return {
      success: true,
      schedule,
      pointsSummary,
      totalDays: schedule.length
    };

  } catch (error) {
    console.error('Schedule generation error:', error);
    return {
      success: false,
      error: '条件をすべて満たす勤務表は作成できません: ' + error.message
    };
  }
};

module.exports = { generateSchedule };
const moment = require('moment');

class HolidayService {
  constructor() {
    // 2025年の日本の祝日
    this.holidays2025 = {
      '2025-01-01': '元日',
      '2025-01-13': '成人の日',
      '2025-02-11': '建国記念の日',
      '2025-02-23': '天皇誕生日',
      '2025-03-20': '春分の日',
      '2025-04-29': '昭和の日',
      '2025-05-03': '憲法記念日',
      '2025-05-04': 'みどりの日',
      '2025-05-05': 'こどもの日',
      '2025-07-21': '海の日',
      '2025-08-11': '山の日',
      '2025-09-15': '敬老の日',
      '2025-09-23': '秋分の日',
      '2025-10-13': 'スポーツの日',
      '2025-11-03': '文化の日',
      '2025-11-23': '勤労感謝の日'
    };

    // 2024年の祝日も含める
    this.holidays2024 = {
      '2024-01-01': '元日',
      '2024-01-08': '成人の日',
      '2024-02-11': '建国記念の日',
      '2024-02-12': '振替休日',
      '2024-02-23': '天皇誕生日',
      '2024-03-20': '春分の日',
      '2024-04-29': '昭和の日',
      '2024-05-03': '憲法記念日',
      '2024-05-04': 'みどりの日',
      '2024-05-05': 'こどもの日',
      '2024-05-06': '振替休日',
      '2024-07-15': '海の日',
      '2024-08-11': '山の日',
      '2024-08-12': '振替休日',
      '2024-09-16': '敬老の日',
      '2024-09-22': '秋分の日',
      '2024-09-23': '振替休日',
      '2024-10-14': 'スポーツの日',
      '2024-11-03': '文化の日',
      '2024-11-04': '振替休日',
      '2024-11-23': '勤労感謝の日',
      '2024-12-23': '天皇誕生日（旧）'
    };

    this.allHolidays = { ...this.holidays2024, ...this.holidays2025 };
  }

  isHoliday(date) {
    const dateStr = moment(date).format('YYYY-MM-DD');
    return this.allHolidays[dateStr] || null;
  }

  getHolidayName(date) {
    const dateStr = moment(date).format('YYYY-MM-DD');
    return this.allHolidays[dateStr];
  }

  isWeekend(date) {
    const dayOfWeek = moment(date).day();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
  }

  isSaturday(date) {
    return moment(date).day() === 6;
  }

  isSunday(date) {
    return moment(date).day() === 0;
  }

  isHolidayOrWeekend(date) {
    return this.isHoliday(date) || this.isWeekend(date);
  }

  getDayOfWeekJapanese(date) {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return dayNames[moment(date).day()];
  }

  // 第3土曜日かどうかを判定
  isThirdSaturday(date) {
    const momentDate = moment(date);
    if (momentDate.day() !== 6) return false; // 土曜日でない
    
    const firstOfMonth = momentDate.clone().startOf('month');
    const firstSaturday = firstOfMonth.clone().day(6);
    if (firstSaturday.month() !== firstOfMonth.month()) {
      firstSaturday.add(7, 'days');
    }
    
    const thirdSaturday = firstSaturday.clone().add(14, 'days');
    return momentDate.isSame(thirdSaturday, 'day');
  }

  // 外来が必要な土曜日かどうか（第3土曜除く）
  isOutpatientSaturday(date) {
    return this.isSaturday(date) && !this.isThirdSaturday(date) && !this.isHoliday(date);
  }
}

module.exports = HolidayService;
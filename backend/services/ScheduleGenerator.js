const moment = require('moment');

class ScheduleGenerator {
  constructor(doctors, holidayService) {
    this.doctors = doctors;
    this.holidayService = holidayService;
    this.schedule = [];
    this.doctorStats = {};
    this.errors = [];
    
    // 医師をグループ別に分類
    this.group1and2 = doctors.filter(d => d.group === '①' || d.group === '②');
    this.group1 = doctors.filter(d => d.group === '①');
    this.group2 = doctors.filter(d => d.group === '②');
    this.group3 = doctors.filter(d => d.group === '③');
    
    // 統計初期化
    this.initializeStats();
  }

  initializeStats() {
    this.doctors.forEach(doctor => {
      this.doctorStats[doctor.name] = {
        totalPoints: 0,
        upper: 0,
        lower: 0,
        inHospitalBU: 0,
        outpatient: 0,
        lastAssignment: null
      };
    });
  }

  async generateSchedule(startDate, endDate) {
    try {
      this.schedule = [];
      this.errors = [];
      this.initializeStats();

      // 期間内の全日付を生成
      const dates = this.generateDateRange(startDate, endDate);
      
      // 各日付に対してスケジューリング
      for (const date of dates) {
        const daySchedule = this.scheduleDay(date);
        if (!daySchedule.success) {
          this.errors.push(`${date}: ${daySchedule.error}`);
        }
        this.schedule.push(daySchedule.day);
      }

      // 制約違反チェック
      const validationResult = this.validateSchedule();
      if (!validationResult.valid) {
        this.errors.push(...validationResult.errors);
      }

      return {
        success: this.errors.length === 0,
        schedule: this.schedule,
        stats: this.doctorStats,
        errors: this.errors
      };

    } catch (error) {
      return {
        success: false,
        errors: [`スケジュール生成エラー: ${error.message}`]
      };
    }
  }

  generateDateRange(startDate, endDate) {
    const dates = [];
    const current = moment(startDate);
    const end = moment(endDate);

    while (current.isSameOrBefore(end)) {
      dates.push(current.format('YYYY-MM-DD'));
      current.add(1, 'day');
    }

    return dates;
  }

  scheduleDay(date) {
    const dayOfWeek = this.holidayService.getDayOfWeekJapanese(date);
    const holiday = this.holidayService.getHolidayName(date);
    const isSaturday = this.holidayService.isSaturday(date);
    const isSunday = this.holidayService.isSunday(date);
    const isOutpatientSaturday = this.holidayService.isOutpatientSaturday(date);

    const day = {
      date,
      dayOfWeek,
      holiday,
      assignments: {
        upper: null,
        lower: null,
        inHospitalBU: null,
        outpatientDoctor: null,
        outpatientSupervisor: null
      }
    };

    try {
      // 上当直の割り当て
      const upperResult = this.assignUpper(date, day);
      if (!upperResult.success) {
        return { success: false, error: upperResult.error, day };
      }

      // 下当直の割り当て
      const lowerResult = this.assignLower(date, day);
      if (!lowerResult.success) {
        return { success: false, error: lowerResult.error, day };
      }

      // 院内BUの割り当て（上当直がグループ②の場合）
      if (day.assignments.upper && this.getDoctorByName(day.assignments.upper).group === '②') {
        const buResult = this.assignInHospitalBU(date, day);
        if (!buResult.success) {
          return { success: false, error: buResult.error, day };
        }
      }

      // 外来の割り当て（土曜日、第3土曜除く）
      if (isOutpatientSaturday) {
        const outpatientResult = this.assignOutpatient(date, day);
        if (!outpatientResult.success) {
          return { success: false, error: outpatientResult.error, day };
        }
      }

      return { success: true, day };

    } catch (error) {
      return { success: false, error: `予期しないエラー: ${error.message}`, day };
    }
  }

  assignUpper(date, day) {
    const availableDoctors = this.getAvailableDoctors(date, this.group1and2, 'upper');
    
    if (availableDoctors.length === 0) {
      return { success: false, error: '上当直を割り当てる医師がいません' };
    }

    // 公平性を考慮して選択
    const selectedDoctor = this.selectDoctorByFairness(availableDoctors, 'upper', date);
    day.assignments.upper = selectedDoctor.name;
    
    // 統計更新
    const points = this.calculatePoints(date, 'upper');
    this.updateStats(selectedDoctor.name, 'upper', points, date);

    return { success: true };
  }

  assignLower(date, day) {
    const availableDoctors = this.getAvailableDoctors(date, this.group3, 'lower');
    
    if (availableDoctors.length === 0) {
      return { success: false, error: '下当直を割り当てる医師がいません' };
    }

    const selectedDoctor = this.selectDoctorByFairness(availableDoctors, 'lower', date);
    day.assignments.lower = selectedDoctor.name;
    
    const points = this.calculatePoints(date, 'lower');
    this.updateStats(selectedDoctor.name, 'lower', points, date);

    return { success: true };
  }

  assignInHospitalBU(date, day) {
    const availableDoctors = this.getAvailableDoctors(date, this.group1, 'inHospitalBU')
      .filter(d => d.name !== day.assignments.upper); // 上当直と同じ人は除外
    
    if (availableDoctors.length === 0) {
      return { success: false, error: '院内BUを割り当てる医師がいません' };
    }

    const selectedDoctor = this.selectDoctorByFairness(availableDoctors, 'inHospitalBU', date);
    day.assignments.inHospitalBU = selectedDoctor.name;
    
    const points = this.calculatePoints(date, 'inHospitalBU');
    this.updateStats(selectedDoctor.name, 'inHospitalBU', points, date);

    return { success: true };
  }

  assignOutpatient(date, day) {
    const availableDoctors = this.getAvailableDoctors(date, this.group1and2, 'outpatient')
      .filter(d => d.name !== day.assignments.upper && d.name !== day.assignments.inHospitalBU);
    
    if (availableDoctors.length < 2) {
      return { success: false, error: '外来担当・指導医を割り当てる医師が不足しています' };
    }

    // 外来担当医を選択
    const doctorSelected = this.selectDoctorByFairness(availableDoctors, 'outpatient', date);
    day.assignments.outpatientDoctor = doctorSelected.name;
    
    // 外来指導医を選択（担当医と異なる）
    const supervisorCandidates = availableDoctors.filter(d => d.name !== doctorSelected.name);
    const supervisorSelected = this.selectDoctorByFairness(supervisorCandidates, 'outpatient', date);
    day.assignments.outpatientSupervisor = supervisorSelected.name;
    
    const points = this.calculatePoints(date, 'outpatient');
    this.updateStats(doctorSelected.name, 'outpatient', points, date);
    this.updateStats(supervisorSelected.name, 'outpatient', points, date);

    return { success: true };
  }

  getAvailableDoctors(date, doctorPool, assignmentType) {
    return doctorPool.filter(doctor => {
      // 不都合日チェック
      if (doctor.unavailableDays && doctor.unavailableDays.includes(date)) {
        return false;
      }

      // 定期外来の前日チェック
      if (this.isBeforeRegularClinic(date, doctor)) {
        return false;
      }

      // 前日の勤務チェック
      if (this.hasAssignmentPreviousDay(date, doctor.name)) {
        return false;
      }

      // 院内BUの前日チェック
      if (assignmentType === 'upper' || assignmentType === 'lower') {
        if (this.hasBUNextDay(date, doctor.name)) {
          return false;
        }
      }

      return true;
    });
  }

  isBeforeRegularClinic(date, doctor) {
    if (!doctor.regularClinicDays || doctor.regularClinicDays.length === 0) {
      return false;
    }

    const nextDay = moment(date).add(1, 'day');
    const nextDayOfWeek = this.holidayService.getDayOfWeekJapanese(nextDay.format('YYYY-MM-DD'));
    
    return doctor.regularClinicDays.includes(nextDayOfWeek);
  }

  hasAssignmentPreviousDay(date, doctorName) {
    const previousDay = moment(date).subtract(1, 'day').format('YYYY-MM-DD');
    const previousDaySchedule = this.schedule.find(d => d.date === previousDay);
    
    if (!previousDaySchedule) return false;

    const assignments = previousDaySchedule.assignments;
    return assignments.upper === doctorName || 
           assignments.lower === doctorName || 
           assignments.inHospitalBU === doctorName;
  }

  hasBUNextDay(date, doctorName) {
    const nextDay = moment(date).add(1, 'day').format('YYYY-MM-DD');
    const nextDaySchedule = this.schedule.find(d => d.date === nextDay);
    
    if (!nextDaySchedule) return false;

    return nextDaySchedule.assignments.inHospitalBU === doctorName;
  }

  selectDoctorByFairness(availableDoctors, assignmentType, date) {
    // 最も点数が少ない医師を優先選択
    return availableDoctors.reduce((selected, current) => {
      const selectedStats = this.doctorStats[selected.name];
      const currentStats = this.doctorStats[current.name];
      
      if (currentStats.totalPoints < selectedStats.totalPoints) {
        return current;
      }
      
      // 点数が同じ場合は最後の割り当てが古い医師を優先
      if (currentStats.totalPoints === selectedStats.totalPoints) {
        if (!currentStats.lastAssignment || 
            (selectedStats.lastAssignment && currentStats.lastAssignment < selectedStats.lastAssignment)) {
          return current;
        }
      }
      
      return selected;
    });
  }

  calculatePoints(date, assignmentType) {
    const isSaturday = this.holidayService.isSaturday(date);
    const isSunday = this.holidayService.isSunday(date);
    const isHoliday = this.holidayService.isHoliday(date);

    if (isSaturday && !isHoliday) {
      switch (assignmentType) {
        case 'upper': return 2.0;
        case 'lower': return 2.0;
        case 'outpatient': return 0.5;
        case 'inHospitalBU': return 1.5;
        default: return 1.0;
      }
    } else if (isSunday || isHoliday) {
      switch (assignmentType) {
        case 'upper': return 1.0;
        case 'lower': return 0.5;
        case 'inHospitalBU': return 1.5;
        default: return 1.0;
      }
    } else {
      // 平日
      switch (assignmentType) {
        case 'upper': return 1.0;
        case 'lower': return 0.5;
        case 'inHospitalBU': return 1.0;
        default: return 1.0;
      }
    }
  }

  updateStats(doctorName, assignmentType, points, date) {
    const stats = this.doctorStats[doctorName];
    stats.totalPoints += points;
    stats[assignmentType]++;
    stats.lastAssignment = date;
  }

  getDoctorByName(name) {
    return this.doctors.find(d => d.name === name);
  }

  validateSchedule() {
    const errors = [];
    
    // 各医師の勤務間隔チェック
    for (const doctor of this.doctors) {
      const violations = this.checkDutyInterval(doctor.name);
      if (violations.length > 0) {
        errors.push(...violations);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  checkDutyInterval(doctorName) {
    const violations = [];
    let lastDutyDate = null;

    for (const day of this.schedule) {
      const assignments = day.assignments;
      const hasDuty = assignments.upper === doctorName || 
                     assignments.lower === doctorName || 
                     assignments.inHospitalBU === doctorName;

      if (hasDuty) {
        if (lastDutyDate) {
          const daysDiff = moment(day.date).diff(moment(lastDutyDate), 'days');
          if (daysDiff < 1) {
            violations.push(`${doctorName}: ${lastDutyDate}と${day.date}の勤務間隔が不十分`);
          }
        }
        lastDutyDate = day.date;
      }
    }

    return violations;
  }
}

module.exports = ScheduleGenerator;
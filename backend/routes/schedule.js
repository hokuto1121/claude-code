const express = require('express');
const router = express.Router();
const ScheduleGenerator = require('../services/ScheduleGenerator');
const HolidayService = require('../services/HolidayService');

router.post('/generate-schedule', async (req, res) => {
  try {
    const { doctors, startDate, endDate } = req.body;

    // Validation
    if (!doctors || !Array.isArray(doctors) || doctors.length === 0) {
      return res.status(400).json({ error: '医師データが必要です' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: '開始日と終了日が必要です' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ error: '終了日は開始日より後である必要があります' });
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 90) {
      return res.status(400).json({ error: '期間は90日以内で設定してください' });
    }

    // Validate doctor data structure
    for (const doctor of doctors) {
      if (!doctor.name || !doctor.group) {
        return res.status(400).json({ error: '医師データに氏名とグループが必要です' });
      }
      if (!['①', '②', '③'].includes(doctor.group)) {
        return res.status(400).json({ error: 'グループは①、②、③のいずれかである必要があります' });
      }
    }

    const holidayService = new HolidayService();
    const generator = new ScheduleGenerator(doctors, holidayService);
    
    const result = await generator.generateSchedule(startDate, endDate);
    
    if (!result.success) {
      return res.status(422).json({ 
        error: '条件をすべて満たす勤務表は作成できません',
        details: result.errors 
      });
    }

    res.json({
      schedule: result.schedule,
      stats: result.stats,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Schedule generation error:', error);
    res.status(500).json({ 
      error: 'スケジュール生成中にエラーが発生しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/sample-data', (req, res) => {
  const sampleDoctors = [
    {
      name: '田中太郎',
      group: '①',
      regularClinicDays: ['月', '水'],
      unavailableDays: ['2025-01-20', '2025-02-05']
    },
    {
      name: '佐藤花子',
      group: '①',
      regularClinicDays: ['火', '木'],
      unavailableDays: ['2025-01-25', '2025-02-10']
    },
    {
      name: '鈴木一郎',
      group: '②',
      regularClinicDays: ['金'],
      unavailableDays: ['2025-01-30']
    },
    {
      name: '高橋美咲',
      group: '②',
      regularClinicDays: ['水', '金'],
      unavailableDays: ['2025-02-01', '2025-02-15']
    },
    {
      name: '山田健太',
      group: '③',
      regularClinicDays: [],
      unavailableDays: ['2025-01-22', '2025-02-07']
    },
    {
      name: '渡辺恵美',
      group: '③',
      regularClinicDays: ['月'],
      unavailableDays: ['2025-01-28']
    }
  ];

  res.json({ doctors: sampleDoctors });
});

module.exports = router;
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { generateSchedule } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Parse CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const doctors = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Parse CSV row: 氏名,グループ,定期外来日,不都合日
        const doctor = {
          name: row['氏名'] || row.name || Object.values(row)[0],
          group: row['グループ'] || row.group || Object.values(row)[1],
          regularClinicDays: (row['定期外来日'] || row.regularClinicDays || Object.values(row)[2] || '').split(',').filter(d => d.trim()),
          unavailableDays: (row['不都合日'] || row.unavailableDays || Object.values(row)[3] || '').split(',').filter(d => d.trim())
        };
        doctors.push(doctor);
      })
      .on('end', () => {
        resolve(doctors);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// API Routes
app.post('/api/upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSVファイルが選択されていません' });
    }

    const doctors = await parseCSV(req.file.path);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ doctors });
  } catch (error) {
    console.error('CSV parsing error:', error);
    res.status(500).json({ error: 'CSVファイルの解析に失敗しました' });
  }
});

app.post('/api/generate-schedule', async (req, res) => {
  try {
    const { doctors, startDate, endDate } = req.body;

    if (!doctors || !startDate || !endDate) {
      return res.status(400).json({ error: '必要なパラメータが不足しています' });
    }

    const schedule = generateSchedule(doctors, startDate, endDate);
    
    if (!schedule.success) {
      return res.status(400).json({ error: schedule.error });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Schedule generation error:', error);
    res.status(500).json({ error: 'スケジュール生成に失敗しました' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '医師当直表生成APIが稼働中です' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
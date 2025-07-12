import React, { useRef } from 'react';
import styled from 'styled-components';

const UploadContainer = styled.div`
  border: 2px dashed #bdc3c7;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;

  &:hover {
    border-color: #3498db;
  }
`;

const UploadButton = styled.button`
  background: #2ecc71;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;

  &:hover {
    background: #27ae60;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const FileUpload = ({ onFileUpload }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const doctors = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= 4) {
              doctors.push({
                name: values[0],
                group: values[1],
                regularClinicDays: values[2] ? values[2].split('・') : [],
                unavailableDays: values[3] ? values[3].split('・') : []
              });
            }
          }
        }
        onFileUpload(doctors);
      };
      reader.readAsText(file, 'UTF-8');
    } else {
      alert('CSVファイルを選択してください');
    }
  };

  return (
    <UploadContainer onClick={handleFileSelect}>
      <div>📄 CSVファイルをここにドロップするか、クリックして選択</div>
      <div style={{ fontSize: '14px', color: '#7f8c8d', marginTop: '10px' }}>
        形式: 氏名, グループ(①/②/③), 定期外来日(・区切り), 不都合日(・区切り)
      </div>
      <UploadButton type="button">ファイルを選択</UploadButton>
      <HiddenInput
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
      />
    </UploadContainer>
  );
};

export default FileUpload;

import React from 'react';

interface BackgroundBlobsProps {
  userType: 'Học sinh' | 'Giáo viên';
}

const studentColors = {
  blob1: 'rgb(34, 211, 238)',   // Cyan-400
  blob2: 'rgb(56, 189, 248)',   // Sky-400
  blob3: 'rgb(96, 165, 250)',  // Blue-400
};

const teacherColors = {
  blob1: 'rgb(14, 165, 233)',   // Sky-600
  blob2: 'rgb(56, 189, 248)',  // Sky-400
  blob3: 'rgb(2, 132, 199)',   // Sky-700
};

const BackgroundBlobs: React.FC<BackgroundBlobsProps> = ({ userType }) => {
  const colors = userType === 'Giáo viên' ? teacherColors : studentColors;
  
  return (
    <div className="colorful-bg">
      <div className="blob1" style={{ backgroundColor: colors.blob1 }}></div>
      <div className="blob2" style={{ backgroundColor: colors.blob2 }}></div>
      <div className="blob3" style={{ backgroundColor: colors.blob3 }}></div>
    </div>
  );
};

export default BackgroundBlobs;

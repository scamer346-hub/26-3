import React from 'react';

interface RangeCellProps {
  label: string;
  sublabel: string;
}

const RangeCell: React.FC<RangeCellProps> = ({ label, sublabel }) => {
  return (
    <div className="
      w-[3.0rem] h-[3.8rem] 
      sm:w-[3.2rem] sm:h-[4.0rem]
      md:w-[4.5rem] md:h-[5.4rem] 
      lg:w-[5.2rem] lg:h-[6.2rem]
      p-1 
      border border-dashed border-white/10 
      rounded-lg md:rounded-xl
      bg-white/5 backdrop-blur-sm
      flex flex-col items-center justify-center
      text-slate-500 font-medium 
      select-none cursor-default
      text-center
      hover:bg-white/10 transition-colors
    ">
      <span className="text-[8px] md:text-[10px] font-bold text-white/60 leading-tight">{label}</span>
      <span className="text-[8px] md:text-[9px] opacity-40 mt-0.5">{sublabel}</span>
    </div>
  );
};

export default RangeCell;

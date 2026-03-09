import React from 'react';
import { ChemicalElement } from '../types';

interface SearchResultsProps {
  results: ChemicalElement[];
  onSelect: (element: ChemicalElement) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, onSelect }) => {
  return (
    <div className="absolute top-full mt-2 w-full bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg max-h-60 overflow-y-auto z-50">
      <ul>
        {results.map(el => (
          <li key={el.number}>
            <button 
              onClick={() => onSelect(el)}
              className="w-full text-left px-4 py-2 hover:bg-cyan-500/20 transition-colors duration-150"
            >
              <span className="font-bold">{el.symbol}</span> - {el.name} ({el.number})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchResults;

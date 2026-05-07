import React from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';

export default function SearchComponent() {
  return (
    <div className="relative flex items-center justify-center mt-6 w-full px-4">
      {/* Liquid Glass Container */}
      <div 
        id="main" 
        className="relative w-full max-w-[500px] sm:max-w-[600px] shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-full bg-white/40 backdrop-blur-md flex items-center p-2 border border-white/60 transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
      >
        <div className="pl-4 text-gray-600">
          <Search size={24} strokeWidth={2.5} />
        </div>
        
        <input 
          placeholder="Enter your competitor..." 
          type="text" 
          name="text" 
          className="bg-transparent border-none text-gray-900 w-full h-[54px] sm:h-[60px] px-4 text-base sm:text-lg focus:outline-none placeholder-gray-600 font-medium tracking-wide" 
        />
        
        <Link href="/login" className="flex items-center justify-center shrink-0 h-[50px] sm:h-[56px] w-[100px] sm:w-[124px] rounded-full bg-gray-900 text-white font-semibold shadow-lg hover:bg-black hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer text-sm sm:text-base tracking-wide">
          Spy
        </Link>
      </div>
    </div>
  );
}

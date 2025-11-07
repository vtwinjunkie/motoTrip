import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GeocodingSuggestion } from '../types';
import { fetchSuggestions } from '../services/geocodingService';

interface AutocompleteInputProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (newValue: string) => void;
  placeholder: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ id, label, value, onValueChange, placeholder }) => {
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);

  const fetchAutocompleteSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const results = await fetchSuggestions(query);
      setSuggestions(results);
    } catch (error) {
      console.error("Failed to fetch suggestions", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
        if (value) {
           fetchAutocompleteSuggestions(value);
        } else {
            setSuggestions([]);
        }
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [value, fetchAutocompleteSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSelect = (suggestion: GeocodingSuggestion) => {
    onValueChange(suggestion.displayName);
    setSuggestions([]);
    setIsDropdownVisible(false);
  };

  return (
    <div className="relative" ref={componentRef}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => setIsDropdownVisible(true)}
        placeholder={placeholder}
        className="w-full bg-gray-700/50 border border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        required
        autoComplete="off"
      />
      {isDropdownVisible && (value.length > 2) && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-gray-400">Loading...</div>
          ) : suggestions.length > 0 ? (
            <ul>
              {suggestions.map((s, index) => (
                <li
                  key={index}
                  onClick={() => handleSelect(s)}
                  className="px-4 py-2 text-gray-300 hover:bg-blue-600 hover:text-white cursor-pointer"
                >
                  {s.displayName}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-gray-400">No results found.</div>
          )}
        </div>
      )}
    </div>
  );
};

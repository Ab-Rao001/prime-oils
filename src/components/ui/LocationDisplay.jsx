import React, { useState, useEffect } from 'react';
import Typography from './Typography';
import { formatNominatimAddress } from '../../utils/addressUtils';

// In-memory cache to prevent spamming the geocoding API
const addressCache = new Map();

export default function LocationDisplay({ loc, className = '', truncate = false }) {
  const [display, setDisplay] = useState(loc);

  useEffect(() => {
    if (!loc) {
      setDisplay('No location');
      return;
    }

    // Check if loc is a coordinate pair: "30.668392, 73.106716"
    const coordMatch = String(loc).match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      
      // Check cache first
      const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      if (addressCache.has(cacheKey)) {
        setDisplay(addressCache.get(cacheKey));
        return;
      }

      // Fetch from Nominatim (with a slight random delay to stagger requests if a list is rendered)
      const delay = Math.random() * 1000;
      const timeoutId = setTimeout(() => {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`)
          .then(res => res.json())
          .then(data => {
            const formattedAddress = formatNominatimAddress(data, lat, lon);
            addressCache.set(cacheKey, formattedAddress);
            setDisplay(formattedAddress);
          })
          .catch(err => console.warn('Geocoding failed for', loc, err));
      }, delay);
      
      return () => clearTimeout(timeoutId);
    } else {
      setDisplay(loc);
    }
  }, [loc]);

  return (
    <span className={`${truncate ? 'truncate' : ''} ${className}`} title={display}>
      {display}
    </span>
  );
}

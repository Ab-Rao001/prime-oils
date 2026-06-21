export function formatNominatimAddress(data, lat, lon) {
  if (!data || !data.address) {
    if (data?.display_name) return `${data.display_name} [${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}]`;
    return `${lat},${lon}`;
  }
  
  const { 
    amenity, building, shop, house_number, road, 
    neighbourhood, suburb, village, town, city, state
  } = data.address;

  // Gather specific details from most specific to least specific
  const specificParts = [amenity, building, shop, house_number, road, neighbourhood, suburb, village, town, city, state].filter(Boolean);
  
  // Clean parts to remove duplicates (like Sahiwal, Sahiwal Tehsil, Sahiwal District)
  const cleanedParts = [];
  const seenWords = new Set();
  
  for (const part of specificParts) {
    // Basic word normalization to detect repeats (e.g. "Sahiwal" and "Sahiwal District" will overlap on "Sahiwal")
    const baseWord = part.replace(/( Tehsil| District| Division| City| Town)/ig, '').trim().toLowerCase();
    if (!seenWords.has(baseWord)) {
      cleanedParts.push(part);
      seenWords.add(baseWord);
    }
  }

  // Join the cleaned parts
  let formatted = cleanedParts.join(', ');
  
  // If we couldn't get anything decent, fallback to display_name
  if (!formatted) {
    formatted = data.display_name || '';
  }

  // Append precise coordinates so the landmark is never lost
  if (lat && lon) {
     const latNum = Number(lat).toFixed(4);
     const lonNum = Number(lon).toFixed(4);
     // Add it if it's not already the only thing
     formatted = `${formatted} [${latNum}, ${lonNum}]`;
  }

  return formatted;
}

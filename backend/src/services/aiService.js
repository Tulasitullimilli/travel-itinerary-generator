const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const pdfParse = require('pdf-parse');

// Initialize Gemini Client helper
const getGeminiClient = (userKey) => {
  const apiKey = userKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Extracts raw text from a PDF file using pdf-parse
 */
const parsePdfText = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to read PDF file content');
  }
};

/**
 * Converts a local file to a GoogleGenerativeAI.Part object
 */
const fileToGenerativePart = (filePath, mimeType) => {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
};

/**
 * Helper to analyze text for destination/type keywords to make the mock output feel smart
 */
const heuristicAnalyzeText = (text = '', originalName = '') => {
  const content = (text + ' ' + originalName).toLowerCase();
  
  let destination = 'Paris'; // default fallback
  if (content.includes('tokyo') || content.includes('japan') || content.includes('hnd') || content.includes('nrt')) {
    destination = 'Tokyo';
  } else if (content.includes('london') || content.includes('uk') || content.includes('heathrow') || content.includes('lhr')) {
    destination = 'London';
  } else if (content.includes('new york') || content.includes('nyc') || content.includes('jfk') || content.includes('usa')) {
    destination = 'New York';
  } else if (content.includes('mumbai') || content.includes('india') || content.includes('bom')) {
    destination = 'Mumbai';
  } else if (content.includes('rome') || content.includes('italy') || content.includes('fco')) {
    destination = 'Rome';
  }

  let type = 'other';
  if (content.includes('flight') || content.includes('ticket') || content.includes('boarding') || content.includes('airline') || content.includes('delta') || content.includes('united') || content.includes('flightstats')) {
    type = 'flight';
  } else if (content.includes('hotel') || content.includes('stay') || content.includes('booking') || content.includes('accommodation') || content.includes('check-in') || content.includes('hilton') || content.includes('airbnb')) {
    type = 'hotel';
  } else if (content.includes('train') || content.includes('railway') || content.includes('amtrak') || content.includes('eurostar')) {
    type = 'train';
  } else if (content.includes('bus') || content.includes('greyhound') || content.includes('flixbus')) {
    type = 'bus';
  }

  let provider = 'Travel Service';
  if (type === 'flight') {
    if (content.includes('delta')) provider = 'Delta Air Lines';
    else if (content.includes('united')) provider = 'United Airlines';
    else if (content.includes('emirates')) provider = 'Emirates';
    else if (content.includes('lufthansa')) provider = 'Lufthansa';
    else provider = 'Global Airways';
  } else if (type === 'hotel') {
    if (content.includes('hilton')) provider = 'Hilton Hotels & Resorts';
    else if (content.includes('marriott')) provider = 'Marriott International';
    else if (content.includes('airbnb')) provider = 'Airbnb Stay';
    else provider = 'Grand Horizon Hotel';
  }

  // Extract a date if present, otherwise set to tomorrow
  let dateTime = new Date();
  dateTime.setDate(dateTime.getDate() + 1); // default to tomorrow
  
  // Basic date match regex: DD-MM-YYYY, YYYY-MM-DD, or Month DD, YYYY
  const dateRegex = /\b(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})|([A-Za-z]+ \d{1,2},? \d{4})\b/;
  const match = content.match(dateRegex);
  if (match) {
    const parsedDate = Date.parse(match[0]);
    if (!isNaN(parsedDate)) {
      dateTime = new Date(parsedDate);
    }
  }

  return { type, provider, destination, dateTime };
};

/**
 * AI service to extract booking details
 */
const extractBookingDetails = async (filePath, mimeType, originalName, userKey) => {
  const genAI = getGeminiClient(userKey);

  // If no API key, execute Mock Extraction
  if (!genAI) {
    console.log('--- GEMINI API KEY MISSING: RUNNING MOCK EXTRACTOR ---');
    let extractedText = '';
    if (mimeType === 'application/pdf') {
      try {
        extractedText = await parsePdfText(filePath);
      } catch (e) {
        extractedText = originalName;
      }
    } else {
      extractedText = originalName; // For images, mock scans file name
    }

    const details = heuristicAnalyzeText(extractedText, originalName);
    
    // Simulate a slight network delay (800ms) for realistic UX
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      type: details.type,
      provider: details.provider,
      referenceNumber: 'TX-' + Math.floor(100000 + Math.random() * 900000),
      dateTime: details.dateTime,
      origin: details.type === 'flight' ? 'New York (JFK)' : '',
      destination: details.destination,
      details: {
        info: `Extracted from ${originalName} (Demo Mode).`,
        seat: details.type === 'flight' ? '18B (Economy)' : undefined,
        room: details.type === 'hotel' ? 'Deluxe Queen Room' : undefined,
        notes: 'Provide a Gemini API Key in Settings to get real-time AI extraction!'
      }
    };
  }

  // Live Gemini API Extraction
  try {
    let prompt = `
      You are an expert travel assistant. Analyze this booking confirmation document and extract the travel booking details.
      Respond strictly in JSON format. Do not write any markdown wrappers (like \`\`\`json) or extra text. Just the raw JSON.
      JSON structure:
      {
        "type": "flight" | "hotel" | "train" | "bus" | "activity" | "other",
        "provider": "Company Name (e.g. Delta, Hilton)",
        "referenceNumber": "Confirmation number or Booking code",
        "dateTime": "ISO Date string (estimate or default if not found)",
        "origin": "Departure city or location (if applicable)",
        "destination": "Arrival city or location (if applicable)",
        "details": {
          "any_extra_info": "e.g. seats, room type, total cost, baggage allowance"
        }
      }
    `;

    let responseText;

    if (mimeType === 'application/pdf') {
      const pdfText = await parsePdfText(filePath);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent([
        prompt,
        `Document Content:\n${pdfText}`
      ]);
      responseText = result.response.text();
    } else {
      // Image support
      const imagePart = fileToGenerativePart(filePath, mimeType);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent([prompt, imagePart]);
      responseText = result.response.text();
    }

    // Clean up markdown response formatting if present
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('Gemini extraction failed, falling back to mock:', error);
    // Dynamic fallback if API key is invalid or errors out
    return heuristicAnalyzeText(originalName, originalName);
  }
};

/**
 * Preset Mock Itineraries for beautiful presentation
 */
const mockItineraries = {
  Tokyo: {
    title: 'Wonders of Tokyo: Neon & Tradition',
    destination: 'Tokyo, Japan',
    days: [
      {
        dayNumber: 1,
        activities: [
          { time: '14:00', activity: 'Arrive at Tokyo Haneda/Narita', location: 'Airport', notes: 'Check in to hotel, recover from jetlag.' },
          { time: '18:00', activity: 'Evening stroll in Shinjuku', location: 'Shinjuku', notes: 'Visit Omoide Yokocho for yakitori, see the giant Godzilla head.' }
        ]
      },
      {
        dayNumber: 2,
        activities: [
          { time: '09:00', activity: 'Senso-ji Temple & Asakusa', location: 'Asakusa', notes: 'Explore Tokyo\'s oldest temple, shop for souvenirs at Nakamise street.' },
          { time: '13:00', activity: 'Sushi Lunch in Ginza', location: 'Ginza', notes: 'Indulge in fresh, high-quality traditional sushi.' },
          { time: '15:30', activity: 'TeamLabs Borderless', location: 'Odaiba', notes: 'Immersive digital art exhibition (Tickets pre-booked).' }
        ]
      },
      {
        dayNumber: 3,
        activities: [
          { time: '10:00', activity: 'Meiji Shrine & Harajuku', location: 'Harajuku', notes: 'Walk through the quiet forest shrine, then dive into colorful Takeshita Street.' },
          { time: '14:00', activity: 'Shibuya Crossing & Hachiko', location: 'Shibuya', notes: 'Cross the busiest intersection in the world, shop at Shibuya Scramble Square.' }
        ]
      },
      {
        dayNumber: 4,
        activities: [
          { time: '08:30', activity: 'Day Trip to Mt. Fuji (Hakone)', location: 'Hakone', notes: 'Take the Romancecar train, ride the Hakone ropeway, soak in an onsen.' }
        ]
      },
      {
        dayNumber: 5,
        activities: [
          { time: '10:00', activity: 'Akihabara Electric Town', location: 'Akihabara', notes: 'Anime, manga, retro gaming, and electronics hunting.' },
          { time: '16:00', activity: 'Departure Logistics', location: 'Airport', notes: 'Head back to airport for flight home.' }
        ]
      }
    ]
  },
  Paris: {
    title: 'Parisian Romance & Fine Art',
    destination: 'Paris, France',
    days: [
      {
        dayNumber: 1,
        activities: [
          { time: '11:00', activity: 'Hotel Check-in & Coffee', location: 'Le Marais', notes: 'Unpack and enjoy a fresh croissant at a local sidewalk cafe.' },
          { time: '15:00', activity: 'Louvre Museum Tour', location: 'Musée du Louvre', notes: 'See the Mona Lisa, Venus de Milo, and Winged Victory.' },
          { time: '19:30', activity: 'Seine River Sunset Cruise', location: 'Bateaux Parisiens', notes: 'Beautiful illuminated views of the Eiffel Tower and Notre Dame.' }
        ]
      },
      {
        dayNumber: 2,
        activities: [
          { time: '09:00', activity: 'Eiffel Tower Summit', location: 'Champ de Mars', notes: 'Take the lift to the top floor for panoramic views of Paris.' },
          { time: '13:00', activity: 'Champs-Élysées & Arc de Triomphe', location: '8th Arrondissement', notes: 'Walk the famous avenue and climb the monument.' }
        ]
      },
      {
        dayNumber: 3,
        activities: [
          { time: '10:00', activity: 'Montmartre & Sacré-Cœur', location: 'Montmartre', notes: 'Visit the painters at Place du Tertre and view the city from the basilica steps.' },
          { time: '14:00', activity: 'Palace of Versailles Day Trip', location: 'Versailles', notes: 'Explore the Hall of Mirrors and the magnificent royal gardens.' }
        ]
      },
      {
        dayNumber: 4,
        activities: [
          { time: '11:00', activity: 'Musée d\'Orsay', location: 'Left Bank', notes: 'Incredible collection of Impressionist masterpieces (Monet, Van Gogh).' },
          { time: '18:00', activity: 'Wine Tasting & Dinner', location: 'Latin Quarter', notes: 'Sample French cheeses and regional wines.' }
        ]
      },
      {
        dayNumber: 5,
        activities: [
          { time: '10:00', activity: 'Notre Dame & Shakespeare and Co.', location: 'Île de la Cité', notes: 'See restoration progress, buy a book stamped with the shop logo.' },
          { time: '15:00', activity: 'Pack and Depart', location: 'CDG Airport', notes: 'Bon Voyage!' }
        ]
      }
    ]
  },
  London: {
    title: 'Royal London & Historic Pubs',
    destination: 'London, United Kingdom',
    days: [
      {
        dayNumber: 1,
        activities: [
          { time: '13:00', activity: 'Hotel Check-in & Pub Lunch', location: 'Soho', notes: 'Try classic fish and chips with a pint of local ale.' },
          { time: '16:00', activity: 'London Eye Flight', location: 'South Bank', notes: '30-minute rotation overlooking Westminster and Big Ben.' }
        ]
      },
      {
        dayNumber: 2,
        activities: [
          { time: '09:30', activity: 'Tower of London & Tower Bridge', location: 'City of London', notes: 'See the Crown Jewels and walk across the glass floors of Tower Bridge.' },
          { time: '14:00', activity: 'British Museum Tour', location: 'Bloomsbury', notes: 'View the Rosetta Stone and Egyptian mummies.' }
        ]
      },
      {
        dayNumber: 3,
        activities: [
          { time: '10:00', activity: 'Buckingham Palace Guard Change', location: 'Westminster', notes: 'Watch the royal guards parade.' },
          { time: '14:00', activity: 'Westminster Abbey & Houses of Parliament', location: 'Westminster', notes: 'See the coronation chair and historic royal tombs.' }
        ]
      },
      {
        dayNumber: 4,
        activities: [
          { time: '10:00', activity: 'Borough Market Food Tour', location: 'Southwark', notes: 'Sample international gourmet street food.' },
          { time: '15:00', activity: 'Hyde Park & Kensington Palace', location: 'Kensington', notes: 'Stroll near the Serpentine lake.' }
        ]
      },
      {
        dayNumber: 5,
        activities: [
          { time: '11:00', activity: 'West End Shopping & Departure', location: 'Regent Street', notes: 'Pick up teas and souvenirs before catching the Heathrow Express.' }
        ]
      }
    ]
  },
  'New York': {
    title: 'Manhattan Skyline & Broadway Dreams',
    destination: 'New York City, USA',
    days: [
      {
        dayNumber: 1,
        activities: [
          { time: '15:00', activity: 'Arrive at Hotel', location: 'Midtown Manhattan', notes: 'Check in, unpack, get ready for NYC energy.' },
          { time: '19:00', activity: 'Times Square Neon Experience', location: 'Broadway & 42nd St', notes: 'Witness the billboards at night, grab a slice of NY pizza.' }
        ]
      },
      {
        dayNumber: 2,
        activities: [
          { time: '09:00', activity: 'Statue of Liberty & Ellis Island', location: 'Battery Park Ferry', notes: 'Take early ferry to see Lady Liberty, learn about immigration history.' },
          { time: '14:00', activity: 'Wall Street & World Trade Center', location: 'Financial District', notes: 'See the Charging Bull, visit the 9/11 Memorial.' }
        ]
      },
      {
        dayNumber: 3,
        activities: [
          { time: '10:00', activity: 'Central Park Walk', location: 'Central Park', notes: 'See Bethesda Fountain, Strawberry Fields, rent a rowboat.' },
          { time: '14:00', activity: 'Museum of Modern Art (MoMA)', location: 'Midtown', notes: 'See Starry Night by Van Gogh and Andy Warhol\'s soup cans.' },
          { time: '20:00', activity: 'Broadway Show', location: 'Theater District', notes: 'Experience world-class live theater.' }
        ]
      },
      {
        dayNumber: 4,
        activities: [
          { time: '10:00', activity: 'High Line & Chelsea Market', location: 'Meatpacking District', notes: 'Walk the elevated park, grab artisanal tacos/donuts at the market.' },
          { time: '16:00', activity: 'Empire State Building Sunset', location: '34th St', notes: 'Unbelievable 360-degree views of the skyline.' }
        ]
      },
      {
        dayNumber: 5,
        activities: [
          { time: '11:00', activity: 'Brooklyn Bridge Walk & Departure', location: 'DUMBO', notes: 'Walk the bridge to Brooklyn for iconic photo, head to JFK/LGA.' }
        ]
      }
    ]
  }
};

/**
 * AI service to generate Itinerary based on booking data
 */
const generateItineraryFromBookings = async (bookings, destinationInput, userKey) => {
  const genAI = getGeminiClient(userKey);

  // Parse destination keyword
  let selectedDestination = destinationInput || 'Paris';
  let matchedPresetKey = 'Paris';

  const destLower = selectedDestination.toLowerCase();
  if (destLower.includes('tokyo') || destLower.includes('japan')) matchedPresetKey = 'Tokyo';
  else if (destLower.includes('london') || destLower.includes('uk')) matchedPresetKey = 'London';
  else if (destLower.includes('new york') || destLower.includes('nyc')) matchedPresetKey = 'New York';

  // Determine starting date from bookings (take the earliest date)
  let itineraryStartDate = new Date();
  itineraryStartDate.setDate(itineraryStartDate.getDate() + 1); // default to tomorrow
  
  if (bookings && bookings.length > 0) {
    const dates = bookings
      .map(b => b.dateTime ? new Date(b.dateTime) : null)
      .filter(d => d && !isNaN(d.getTime()));
    if (dates.length > 0) {
      itineraryStartDate = new Date(Math.min(...dates));
    }
  }

  // If no API key, execute Mock Generation
  if (!genAI) {
    console.log('--- GEMINI API KEY MISSING: GENERATING MOCK ITINERARY ---');
    const template = JSON.parse(JSON.stringify(mockItineraries[matchedPresetKey]));
    
    // Map dates dynamically
    template.days = template.days.map((day, idx) => {
      const dayDate = new Date(itineraryStartDate);
      dayDate.setDate(dayDate.getDate() + idx);
      return {
        ...day,
        date: dayDate
      };
    });

    const endDate = new Date(itineraryStartDate);
    endDate.setDate(endDate.getDate() + (template.days.length - 1));

    // Simulate standard AI processing delay (1.2s)
    await new Promise(resolve => setTimeout(resolve, 1200));

    return {
      title: template.title,
      destination: destinationInput || template.destination,
      startDate: itineraryStartDate,
      endDate: endDate,
      days: template.days
    };
  }

  // Live Gemini API Generation
  try {
    const formattedBookings = bookings.map(b => ({
      type: b.type,
      provider: b.provider,
      dateTime: b.dateTime,
      origin: b.origin,
      destination: b.destination,
      details: b.details
    }));

    const prompt = `
      You are a world-class travel planner.
      I have the following booking details:
      ${JSON.stringify(formattedBookings, null, 2)}
      
      Generate a comprehensive travel itinerary for the destination: "${selectedDestination}".
      Use the booking dates/details as hard constraints (e.g., flight arrival times should correspond to Day 1, hotel check-ins, transit, etc.).
      If the details are sparse, fill them in with creative, local sights, dining recommendations, and activities.
      
      Respond strictly in JSON format. Do not write any markdown wrappers (like \`\`\`json) or extra text. Just raw JSON.
      JSON structure must match:
      {
        "title": "A catchy, custom name for this trip",
        "destination": "Main destination city/country",
        "startDate": "ISO Date string (should align with bookings start)",
        "endDate": "ISO Date string (should align with bookings end/length)",
        "days": [
          {
            "dayNumber": 1,
            "date": "ISO Date string for this specific day",
            "activities": [
              {
                "time": "HH:MM format",
                "activity": "Activity description",
                "location": "Specific place name",
                "notes": "Tips, what to eat, or notes related to booking"
              }
            ]
          }
        ]
      }
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean up markdown response formatting if present
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('Gemini itinerary generation failed, falling back to mock:', error);
    
    // Dynamic fallback
    const template = JSON.parse(JSON.stringify(mockItineraries[matchedPresetKey]));
    template.days = template.days.map((day, idx) => {
      const dayDate = new Date(itineraryStartDate);
      dayDate.setDate(dayDate.getDate() + idx);
      return { ...day, date: dayDate };
    });
    const endDate = new Date(itineraryStartDate);
    endDate.setDate(endDate.getDate() + (template.days.length - 1));

    return {
      title: template.title,
      destination: destinationInput || template.destination,
      startDate: itineraryStartDate,
      endDate: endDate,
      days: template.days
    };
  }
};

module.exports = {
  extractBookingDetails,
  generateItineraryFromBookings
};

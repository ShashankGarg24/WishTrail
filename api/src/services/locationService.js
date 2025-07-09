const axios = require('axios');

const LOCATIONIQ_URL = process.env.LOCATIONIQ_URL;
const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY;

const getCitySuggestions = async (query) => {
  if (!query || query.trim().length < 2) return [];

  try {
    const response = await axios.get(LOCATIONIQ_URL, {
      params: {
        key: LOCATIONIQ_API_KEY,
        q: query,
        tag: 'place:city',
        limit: 5,
      },
    });

    return response.data.map((place) => ({
      place_id: place.place_id,
      name: place.address?.name || '',
      state: place.address?.state || '',
      country: place.address?.country || '',
    }));
  } catch (error) {
    console.error('[LocationIQ Error]', error?.response?.data || error.message);
    return [];
  }
};

module.exports = {
  getCitySuggestions,
};

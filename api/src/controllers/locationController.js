const { getCitySuggestions } = require('../services/locationService');

const fetchCitySuggestions = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Query param `q` is required' });
  }

  try {
    const suggestions = await getCitySuggestions(query);
    res.json(suggestions);
  } catch (err) {
    console.error('Location API error:', err.message);
    res.status(500).json({ error: 'Failed to fetch city suggestions' });
  }
};

module.exports = {
  fetchCitySuggestions,
};

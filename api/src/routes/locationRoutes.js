const express = require('express');
const router = express.Router();
const { fetchCitySuggestions } = require('../controllers/locationController');

router.get('/search-city', fetchCitySuggestions);

module.exports = router;

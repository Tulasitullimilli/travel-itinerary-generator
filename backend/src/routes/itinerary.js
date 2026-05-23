const express = require('express');
const router = express.Router();
const {
  uploadBookingDoc,
  generateItinerary,
  getMyItineraries,
  getItineraryById,
  updateItinerary,
  deleteItinerary,
  getSharedItinerary
} = require('../controllers/itineraryController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public route for sharing
router.get('/share/:shareId', getSharedItinerary);

// Protected CRUD routes
router.post('/upload', protect, upload.single('file'), uploadBookingDoc);
router.post('/generate', protect, generateItinerary);
router.get('/', protect, getMyItineraries);
router.get('/:id', protect, getItineraryById);
router.put('/:id', protect, updateItinerary);
router.delete('/:id', protect, deleteItinerary);

module.exports = router;

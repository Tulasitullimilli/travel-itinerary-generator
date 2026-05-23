const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Itinerary = require('../models/Itinerary');
const aiService = require('../services/aiService');

// @desc    Upload document and extract booking details
// @route   POST /api/itineraries/upload
// @access  Private
const uploadBookingDoc = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname;
    
    // Check if custom key was passed in headers
    const userKey = req.headers['x-gemini-key'] || null;

    // Extract details via AI service
    const extractedData = await aiService.extractBookingDetails(filePath, mimeType, originalName, userKey);
    
    // Include fileName to refer back to it
    extractedData.fileName = originalName;

    // Clean up uploaded file from local storage to keep disk clean
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Failed to delete temp file:', err);
    }

    res.status(200).json({
      success: true,
      data: extractedData
    });
  } catch (error) {
    console.error('Upload handling error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate and save new travel itinerary
// @route   POST /api/itineraries/generate
// @access  Private
const generateItinerary = async (req, res) => {
  try {
    const { bookings, destination, title } = req.body;

    if (!destination) {
      return res.status(400).json({ success: false, message: 'Please specify a destination' });
    }

    const userKey = req.headers['x-gemini-key'] || null;

    // Generate itinerary using bookings list
    const generatedData = await aiService.generateItineraryFromBookings(bookings || [], destination, userKey);

    // Prepare Mongoose document
    const itinerary = new Itinerary({
      user: req.user._id,
      title: title || generatedData.title || `Trip to ${destination}`,
      destination: destination || generatedData.destination,
      startDate: generatedData.startDate,
      endDate: generatedData.endDate,
      bookings: bookings || [],
      days: generatedData.days,
      shareId: crypto.randomUUID(), // unique shareable slug
      isPublic: true
    });

    await itinerary.save();

    res.status(201).json({
      success: true,
      data: itinerary
    });
  } catch (error) {
    console.error('Itinerary generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user's itineraries
// @route   GET /api/itineraries
// @access  Private
const getMyItineraries = async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: itineraries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single itinerary by ID
// @route   GET /api/itineraries/:id
// @access  Private
const getItineraryById = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.id || req.params.id);
    
    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }

    // Verify ownership
    if (itinerary.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    res.status(200).json({
      success: true,
      data: itinerary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update itinerary details (e.g. edit days or activities)
// @route   PUT /api/itineraries/:id
// @access  Private
const updateItinerary = async (req, res) => {
  try {
    let itinerary = await Itinerary.findById(req.params.id);

    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }

    // Verify ownership
    if (itinerary.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Update
    itinerary = await Itinerary.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: itinerary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete itinerary
// @route   DELETE /api/itineraries/:id
// @access  Private
const deleteItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);

    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }

    // Verify ownership
    if (itinerary.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await itinerary.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Itinerary removed'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get itinerary by public Share ID
// @route   GET /api/itineraries/share/:shareId
// @access  Public
const getSharedItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({ shareId: req.params.shareId });

    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Shared itinerary not found' });
    }

    if (!itinerary.isPublic) {
      return res.status(403).json({ success: false, message: 'This itinerary is no longer public' });
    }

    res.status(200).json({
      success: true,
      data: itinerary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  uploadBookingDoc,
  generateItinerary,
  getMyItineraries,
  getItineraryById,
  updateItinerary,
  deleteItinerary,
  getSharedItinerary
};

const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['flight', 'hotel', 'train', 'bus', 'activity', 'other'],
    default: 'other'
  },
  provider: {
    type: String,
    default: ''
  },
  referenceNumber: {
    type: String,
    default: ''
  },
  dateTime: {
    type: Date
  },
  origin: {
    type: String,
    default: ''
  },
  destination: {
    type: String,
    default: ''
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  fileName: {
    type: String
  }
});

const ActivitySchema = new mongoose.Schema({
  time: {
    type: String,
    default: ''
  },
  activity: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  }
});

const DaySchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true
  },
  date: {
    type: Date
  },
  activities: [ActivitySchema]
});

const ItinerarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a title for the itinerary']
  },
  destination: {
    type: String,
    required: [true, 'Please add a destination']
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  bookings: [BookingSchema],
  days: [DaySchema],
  shareId: {
    type: String,
    required: true,
    unique: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Itinerary', ItinerarySchema);

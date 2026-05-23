const mongoose = require('mongoose');
const Itinerary = require('./backend/src/models/Itinerary');

const run = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/travel-itinerary-generator');
    console.log('Connected to DB');
    const items = await Itinerary.find({});
    console.log('Itineraries count:', items.length);
    items.forEach(item => {
      console.log(`Title: ${item.title}, Destination: ${item.destination}, ShareId: ${item.shareId}, User: ${item.user}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();

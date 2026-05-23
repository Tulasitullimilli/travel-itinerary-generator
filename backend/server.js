require('dotenv').config();
const app = require('./src/app');
const connectDB = async () => {
  // Connect to DB
  const connect = require('./src/config/db');
  await connect();
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

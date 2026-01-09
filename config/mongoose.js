const mongoose = require('mongoose');

const connect = async () => {
  const uri = process.env.DB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/attribution_db';
  const opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE, 10) : 50
  };

  try {
    await mongoose.connect(uri, opts);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
};

module.exports = { connect, mongoose };

require('dotenv').config();

const app = require('./src/app');
const connectMongoDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectMongoDB();

    app.listen(PORT, () => {
      console.log(`Revora backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
})();

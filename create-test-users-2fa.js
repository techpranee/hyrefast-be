const User = require('./model/user');
const dbService = require('./utils/dbService');
require('dotenv').config();

const mongoose = require('mongoose');

const testUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    // Find and update a test user
    const testEmail = 'admin@test.com';
    
    // First, try to find the user
    let user = await dbService.findOne(User, { email: testEmail, isDeleted: false });
    
    if (!user) {
      // Create a test user
      console.log('Creating test user...');
      const userData = {
        email: testEmail,
        password: 'password123',
        username: 'admin',
        name: 'Test Admin',
        userType: 2, // Recruiter
        isActive: true,
        isDeleted: false,
        twoFactorEnabled: false
      };
      
      user = await dbService.create(User, userData);
      console.log('Test user created:', user.email);
    } else {
      // Update existing user to disable 2FA
      await dbService.updateOne(User, { _id: user._id }, { twoFactorEnabled: false });
      console.log('Updated existing user to disable 2FA:', user.email);
    }

    console.log('User 2FA status:', user.twoFactorEnabled);
    
    // Create another user with 2FA enabled
    const testEmail2 = 'user2fa@test.com';
    let user2fa = await dbService.findOne(User, { email: testEmail2, isDeleted: false });
    
    if (!user2fa) {
      console.log('Creating test user with 2FA enabled...');
      const userData2fa = {
        email: testEmail2,
        password: 'password123',
        username: 'user2fa',
        name: 'Test User 2FA',
        userType: 2, // Recruiter
        isActive: true,
        isDeleted: false,
        twoFactorEnabled: true
      };
      
      user2fa = await dbService.create(User, userData2fa);
      console.log('Test user with 2FA created:', user2fa.email);
    } else {
      // Update existing user to enable 2FA
      await dbService.updateOne(User, { _id: user2fa._id }, { twoFactorEnabled: true });
      console.log('Updated existing user to enable 2FA:', user2fa.email);
    }

    console.log('Users created/updated successfully!');
    console.log('Test login with:', testEmail, '(2FA disabled)');
    console.log('Test login with:', testEmail2, '(2FA enabled)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

testUser();

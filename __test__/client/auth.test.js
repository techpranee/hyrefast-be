/**
 * auth.test.js
 * @description :: contains test cases of APIs for authentication module.
 */

const dotenv = require('dotenv');
dotenv.config();
process.env.NODE_ENV = 'test';
const db = require('mongoose');
const request = require('supertest');
const { MongoClient } = require('mongodb');
const app = require('../../app');
const authConstant=require('../../constants/authConstant');
const uri = 'mongodb://127.0.0.1:27017';

const client = new MongoClient(uri, {
    useUnifiedTopology: true,
    useNewUrlParser: true
});

let insertedWorkspace = {}
let insertedUser = {}

/**
 * @description : model dependencies resolver
 */
beforeAll(async function(){
  try {
    await client.connect();
    const dbInstance = client.db('EcomDb_test');

    const workspace = dbInstance.collection('workspaces');
    insertedWorkspace = await workspace.insertOne({
  name: 'Kristine Langworth',
  website: 'benchmark',
  legal_name: 'Pound',
  logo: 'e-commerce',
  address: '554 Douglas Passage',
  admin: '68b3fa147a03b547a3ec7d23',
  credit_balance: 371,
  id: '68b3fa147a03b547a3ec7d24'
})
    const user = dbInstance.collection('users');
    insertedUser = await user.insertOne({
  username: 'Richmond92',
  password: 'NCJw2DW6ysxigpT',
  email: 'Alexzander0@gmail.com',
  name: 'Horace Cremin',
  userType: 294,
  workspace: '68b3fa147a03b547a3ec7d32',
  mobileNo: '(651) 007-4347',
  loginOTP: {},
  resetPasswordLink: {},
  loginRetryLimit: 688,
  loginReactiveTime: '2026-05-14T18:57:46.841Z',
  ssoAuth: { googleId: 'SCSI' },
  id: '68b3fa147a03b547a3ec7d33'
})
  }
  catch (error) {
      console.error(`we encountered ${error}`);
  }
  finally {
      client.close();
  }
});

// test cases

describe('POST /register -> if email and username is given', () => {
  test('should register a user', async () => {
    let registeredUser = await request(app)
      .post('/client/auth/register')
      .send({"username":"Brett_Padberg74","password":"hdTM6WFV7iVuihp","email":"Telly78@yahoo.com","name":"Melvin Lehner","userType":authConstant.USER_TYPES.Applicant,"workspace":insertedWorkspace.insertedId,"mobileNo":"(556) 950-2436","ssoAuth":{"googleId":"Soft"},"addedBy":insertedUser.insertedId,"updatedBy":insertedUser.insertedId});
    expect(registeredUser.statusCode).toBe(200);
    expect(registeredUser.body.status).toBe('SUCCESS');
    expect(registeredUser.body.data).toMatchObject({
      id: expect.any(String)
    });
  });
});

describe('POST /forgot-password -> if email has not passed from request body', () => {
  test('should return bad request status and insufficient parameters', async () => {
    let user = await request(app)
      .post('/client/auth/forgot-password')
      .send({ email: '' });

    expect(user.statusCode).toBe(400);
    expect(user.body.status).toBe('BAD_REQUEST');
  });
});

describe('POST /forgot-password -> if email passed from request body is not available in database ', () => {
  test('should return record not found status', async () => {
    let user = await request(app)
      .post('/client/auth/forgot-password')
      .send({ 'email': 'unavailable.email@hotmail.com', });

    expect(user.statusCode).toBe(404);
    expect(user.body.status).toBe('RECORD_NOT_FOUND');
  });
});

describe('POST /forgot-password -> if email passed from request body is valid and OTP sent successfully', () => {
  test('should return success message', async () => {
    let user = await request(app)
      .post('/client/auth/forgot-password')
      .send({ 'email':'Telly78@yahoo.com', });

    expect(user.statusCode).toBe(200);
    expect(user.body.status).toBe('SUCCESS');
  });
});

describe('POST /validate-otp -> OTP is sent in request body and OTP is correct', () => {
  test('should return success', () => {
    return request(app)
      .post('/client/auth/login')
      .send(
        {
          username: 'Telly78@yahoo.com',
          password: 'hdTM6WFV7iVuihp'
        }).then(login => () => {
          return request(app)
            .get(`/client/api/v1/user/${login.body.data.id}`)
            .set({
              Accept: 'application/json',
              Authorization: `Bearer ${login.body.data.token}`
            }).then(foundUser => {
              return request(app)
                .post('/client/auth/validate-otp')
                .send({ 'otp': foundUser.body.data.resetPasswordLink.code, }).then(user => {
                  expect(user.statusCode).toBe(200);
                  expect(user.body.status).toBe('SUCCESS');
                });
            })
        });
  });
});

describe('POST /validate-otp -> if OTP is incorrect or OTP has expired', () => {
  test('should return invalid OTP', async () => {
    let user = await request(app)
      .post('/client/auth/validate-otp')
      .send({ 'otp': '12334' });
    
    expect(user.statusCode).toBe(200);
    expect(user.body.status).toBe('FAILURE');
    
  });
});

describe('POST /validate-otp -> if request body is empty or OTP has not been sent in body', () => {
  test('should return insufficient parameter', async () => {
    let user = await request(app)
      .post('/client/auth/validate-otp')
      .send({});

    expect(user.statusCode).toBe(400);
    expect(user.body.status).toBe('BAD_REQUEST');
  });
});

describe('PUT /reset-password -> code is sent in request body and code is correct', () => {
  test('should return success', () => {
    return request(app)
      .post('/client/auth/login')
      .send(
        {
          username: 'Telly78@yahoo.com',
          password: 'hdTM6WFV7iVuihp'
        }).then(login => () => {
          return request(app)
            .get(`/client/api/v1/user/${login.body.data.id}`)
            .set({
              Accept: 'application/json',
              Authorization: `Bearer ${login.body.data.token}`
            }).then(foundUser => {
              return request(app)
                .put('/client/auth/validate-otp')
                .send({ 'code': foundUser.body.data.resetPasswordLink.code, 'newPassword':'newPassword'}).then(user => {
                  expect(user.statusCode).toBe(200);
                  expect(user.body.status).toBe('SUCCESS');
                });
            })
        });
  });
});

describe('PUT /reset-password -> if request body is empty or code/newPassword is not given', () => {
  test('should return insufficient parameter', async () => {
    let user = await request(app)
      .put('/client/auth/reset-password')
      .send({});

    
    expect(user.statusCode).toBe(400);
    expect(user.body.status).toBe('BAD_REQUEST');
  });
});

describe('PUT /reset-password -> if code is invalid', () => {
  test('should return invalid code', async () => {
    let user = await request(app)
      .put('/client/auth/reset-password')
      .send({
        'code': '123',
        'newPassword': 'testPassword'
      });

    expect(user.statusCode).toBe(200);
    expect(user.body.status).toBe('FAILURE');

  });
});

afterAll(function (done) {
  db.connection.db.dropDatabase(function () {
      db.connection.close(function () {
          done();
      });
  });
});

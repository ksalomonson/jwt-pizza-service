const request = require('supertest');
const app = require('../service');
//const config = require("../config.js");

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserId;
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const user = {
		name: testUser.name,
		email: testUser.email,
		roles: [{ role: "diner" }],
	};
  expect(loginRes.body.user).toMatchObject(user);
});

test("update require auth", async () => {
	const updateRes = await request(app)
		.put("/api/auth/" + testUserId)
		.send(testUser);
	expect(updateRes.status).toBe(401);
	expect(updateRes.body).toMatchObject({ message: "unauthorized" });
});

test("update", async () => {
	const updateRes = await request(app)
		.put("/api/auth/" + testUserId)
		.set("Authorization", `Bearer ${testUserAuthToken}`)
		.send(testUser);
	expect(updateRes.status).toBe(200);
	expect(updateRes.body.name).toBe(testUser.name);
	expect(updateRes.body.email).toBe(testUser.email);
});

test("logout require auth", async () => {
	const logoutRes = await request(app).delete("/api/auth").send(testUser);
	expect(logoutRes.status).toBe(401);
	expect(logoutRes.body).toMatchObject({ message: "unauthorized" });
});

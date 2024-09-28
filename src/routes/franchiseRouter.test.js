const { Role, DB } = require("../database/database.js");
const request = require("supertest");
const app = require("../service.js");
const config = require("../config.js");

let adminUser;
let adminUserToken;
let franchise;
let store;

function randomName() {
	return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
	let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
	user.name = randomName();
	user.email = user.name + "@admin.com";

	await DB.addUser(user);

	user.password = "toomanysecrets";
	return user;
}
expect.extend({
	toContainObject(received, argument) {
		const pass = this.equals(
			received,
			expect.arrayContaining([expect.objectContaining(argument)])
		);

		if (pass) {
			return {
				message: () =>
					`expected ${this.utils.printReceived(
						received
					)} not to contain object ${this.utils.printExpected(argument)}`,
				pass: true,
			};
		} else {
			return {
				message: () =>
					`expected ${this.utils.printReceived(
						received
					)} to contain object ${this.utils.printExpected(argument)}`,
				pass: false,
			};
		}
	},
});

beforeAll(async () => {
	config.db.connection.database = "pizzatest";
	const loginRes = await request(app)
		.put("/api/auth")
		.send(await createAdminUser());
	expect(loginRes.status).toBe(200);
	adminUser = loginRes.body.user;
	adminUserToken = loginRes.body.token;
	franchise = { name: randomName(), admins: [{ email: adminUser.email }] };
	store = { name: randomName() };
});

test("create new franchise", async () => {
	const addReq = await request(app)
		.post("/api/franchise")
		.set("Authorization", `Bearer ${adminUserToken}`)
		.send(franchise);
	expect(addReq.status).toBe(200);
	franchise.id = addReq.body.id;
	expect(addReq.body.name).toBe(franchise.name);
	expect(addReq.body.admins[0].email).toBe(adminUser.email);
});

test("create franchise store", async () => {
	const addRes = await request(app)
		.post("/api/franchise/" + franchise.id + "/store")
		.set("Authorization", `Bearer ${adminUserToken}`)
		.send(store);
	expect(addRes.status).toBe(200);
	store.id = addRes.body.id;
	expect(addRes.body.franchiseId).toBe(franchise.id);
	expect(addRes.body.name).toBe(store.name);
});

test("list franchises", async () => {
	const listRes = await request(app).get("/api/franchise").send();
	expect(listRes.status).toBe(200);
	expect(listRes.body).toContainObject({
		id: franchise.id,
		name: franchise.name,
		stores: [{ id: store.id, name: store.name }],
	});
});

test("list user's franchise", async () => {
	const listRes = await request(app)
		.get("/api/franchise/" + adminUser.id)
		.set("Authorization", `Bearer ${adminUserToken}`)
		.send();
	expect(listRes.status).toBe(200);
	expect(listRes.body).toContainObject({
		id: franchise.id,
		name: franchise.name,
		stores: [{ id: store.id, name: store.name, totalRevenue: 0 }],
		admins: [
			{ id: adminUser.id, name: adminUser.name, email: adminUser.email },
		],
	});
});
test("delete a franchise store", async () => {
	const removeRes = await request(app)
		.delete("/api/franchise/" + franchise.id + "/store/" + store.id)
		.set("Authorization", `Bearer ${adminUserToken}`)
		.send();
	expect(removeRes.status).toBe(200);
	expect(removeRes.body.message).toBe("store deleted");
});
test("remove a franchise", async () => {
	const removeRes = await request(app)
		.delete("/api/franchise/" + franchise.id)
		.set("Authorization", `Bearer ${adminUserToken}`)
		.send();
	expect(removeRes.status).toBe(200);
	expect(removeRes.body.message).toBe("franchise deleted");
});

test("list user's franchise", async () => {
	const listRes = await request(app)
		.get("/api/franchise/" + adminUser.id)
		.set("Authorization", `Bearer ${adminUserToken}`)
		.send();
	expect(listRes.status).toBe(200);
	expect(listRes.body).toStrictEqual([]);
});
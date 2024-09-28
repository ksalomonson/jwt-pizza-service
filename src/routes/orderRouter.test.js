const { Role, DB } = require("../database/database.js");
const request = require("supertest");
const app = require("../service.js");
const config = require("../config.js");


let adminUser;
let adminUserToken;
let franchise;
let store;
let menu;

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

	const addReq = await request(app)
		.post("/api/franchise")
		.set("Authorization", `Bearer ${adminUserToken}`)
		.send(franchise);
	expect(addReq.status).toBe(200);
	franchise.id = addReq.body.id;

	const addRes = await request(app)
		.post("/api/franchise/" + franchise.id + "/store")
		.set("Authorization", `Bearer ${adminUserToken}`)
		.send(store);
	expect(addRes.status).toBe(200);
	store.id = addRes.body.id;
	let rand = randomName();
	menu = {
		title: rand,
		description: rand,
		image: rand + ".png",
		price: 42.01,
	};
});

test("Add Menu Item", async () => {
	const addRes = await request(app)
		.put("/api/order/menu")
		.set("Authorization", `Bearer ${adminUserToken}`)
		.send(menu);
	expect(addRes.status).toBe(200);
	menu.id = addRes.body.id;
});

test("Get Menu", async () => {
	const listRes = await request(app).get("/api/order/menu").send();
	expect(listRes.status).toBe(200);
});  

test("Get Order", async () => {
	//add item to menu
	const order = {
		franchiseId: franchise.id,
		storeId: store.id,
		items: [
			{
				menuId: menu.id,
				description: menu.description,
				price: menu.price,
			},
		],
	};

	await request(app)
		.post("/api/order")
		.set("Authorization", `Bearer ${adminUserToken}`)
		.send(order);
	const listRes = await request(app)
		.get("/api/order")
		.set("Authorization", `Bearer ${adminUserToken}`);

	expect(listRes.status).toBe(200);
	expect(listRes.body.orders.length).toBeGreaterThan(0);
	expect(listRes.body.orders).toContainObject({
		franchiseId: franchise.id,
		storeId: store.id,
	});
});

  
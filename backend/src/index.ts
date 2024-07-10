import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  },
  Variables: {
    userId: string;
  };
}>();

app.use("/api/v1/blog/*", async (c, next) => {
  const headerAuth = c.req.header("Authorization");
  if (!headerAuth) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = headerAuth.split(" ")[1];
  const payload = await verify(token, c.env.JWT_SECRET) || "";
  if (!payload) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  console.log(payload)
  //@ts-ignore
  c.set("userId", payload.id);
  await next();
});

app.post("/api/v1/user/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { name, email, password } = body;
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password,
        name,
      },
    });
    const payload = {
      id: user.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };
    const jwtToken = await sign(payload, c.env.JWT_SECRET);
    return c.json({ message: "User created succesfully: " + jwtToken });
  } catch (e) {
    return c.json({ error: "Error while creating user" }, 400);
  }
});

app.post("/api/v1/user/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const userExists = await prisma.user.findUnique({
    where: {
      email: body.email,
    },
  });
  if (!userExists) {
    return c.json({ message: "User not found" }, 400);
  }
  const jwtToken = await sign(
    { id: userExists.id, exp: Math.floor(Date.now() / 1000) + 60 * 60 },
    c.env.JWT_SECRET
  );
  return c.json({ message: "User found", token: jwtToken }, 200);
});

// app.post("/api/v1/blog", (c) => {
//   return c.text("Hello Hono!");
// });

app.post('/api/v1/blog', (c) => {
	console.log(c.get('userId'));
	return c.text('signin route')
})


app.get("/api/v1/blog/:id", (c) => {
  const id = c.req.param("id");
  console.log(id);
  return c.text("get blog route");
});

app.get("/api/v1/blog/bulk", (c) => {
  return c.text("Hello Hono!");
});

export default app;

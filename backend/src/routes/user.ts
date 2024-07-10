import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

userRouter.post("/signup", async (c) => {
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

userRouter.post("/api/v1/user/signin", async (c) => {
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

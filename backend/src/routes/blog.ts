import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";
import { createPostInput,updatePostInput } from "siddhant-medium-common";
export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use("/*", async (c, next) => {
  const headerAuth = c.req.header("authorization") || "";
  const token = headerAuth.split(" ")[1];
  try{
    const user = await verify(token, c.env.JWT_SECRET);
    const userId = user.id
    if(user){
      c.set("userId", userId as string);
      return next();
    }
    else{
      c.status(403)
      return c.json({error: "Unauthorized"})
    }
  }
  catch(e){
    console.log(e)
    c.status(403)
    return c.json({error: "Unauthorized"})
  }
});

blogRouter.post("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = createPostInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}

  const blog = await prisma.blog.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: c.get("userId"),
    },
  });
  return c.json({ message: "Blog created succesfully" + blog.id});
});

blogRouter.put("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = updatePostInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}

  const blog = await prisma.blog.update({
    where: {
      id: body.id,
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });
  return c.json({ message: "Blog updated succesfully" + blog.title + blog.content });
});


blogRouter.get("/bulk", async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    try{
    const blogs = await prisma.blog.findMany();
    return c.json({blogs})
  }
    catch(er){
      console.log(er)
    }
    
  });

blogRouter.get("/:id", async (c) => {
  const body = await c.req.json();
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const blog = await prisma.blog.findFirst({
      where: {
        id: c.req.param('id'),
      },
    });
    return c.json(blog);
  } catch (e) {
    console.log(e);
    return c.json({ error: "Blog not found" }, 400);
  }
});



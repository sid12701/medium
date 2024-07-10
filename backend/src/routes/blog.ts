import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";

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
  const user = await verify(token, c.env.JWT_SECRET);
  if(user){
    //@ts-ignore
    c.set("userId", user.id);
    return next();
  }
  else{
    c.status(403)
    return c.json({error: "Unauthorized"})
  }
});

blogRouter.post("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
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



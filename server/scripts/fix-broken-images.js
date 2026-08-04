/**
 * Patch known broken Unsplash URLs already stored in the database.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const replacements = [
  {
    from: "https://images.unsplash.com/photo-1606811841689-23eaabb5a6b0",
    to: "https://images.unsplash.com/photo-1629909615184-74f495363b67",
  },
  {
    from: "https://images.unsplash.com/photo-1588776813658-606aa85bdfc5",
    to: "https://images.unsplash.com/photo-1622253692010-333f2da6031d",
  },
];

function swap(url, from, to) {
  if (!url || !url.includes(from)) return url;
  return url.replace(from, to);
}

async function main() {
  let updated = 0;

  for (const { from, to } of replacements) {
    const services = await prisma.service.findMany({
      where: { image: { contains: from } },
    });
    for (const row of services) {
      await prisma.service.update({
        where: { id: row.id },
        data: { image: swap(row.image, from, to) },
      });
      updated += 1;
      console.log(`service updated: ${row.title || row.slug}`);
    }

    const gallery = await prisma.gallery.findMany({
      where: {
        OR: [
          { beforeImage: { contains: from } },
          { afterImage: { contains: from } },
        ],
      },
    });
    for (const row of gallery) {
      await prisma.gallery.update({
        where: { id: row.id },
        data: {
          beforeImage: swap(row.beforeImage, from, to),
          afterImage: swap(row.afterImage, from, to),
        },
      });
      updated += 1;
      console.log(`gallery updated: ${row.treatment}`);
    }
  }

  console.log(`Done. Rows updated: ${updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

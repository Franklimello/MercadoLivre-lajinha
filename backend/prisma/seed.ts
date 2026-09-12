import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Veículos', slug: 'veiculos', icon: 'Car' },
  { name: 'Celulares e Telefonia', slug: 'celulares-e-telefonia', icon: 'Smartphone' },
  { name: 'Eletrônicos e Áudio', slug: 'eletronicos-e-audio', icon: 'Tv' },
  { name: 'Informática e Acessórios', slug: 'informatica-e-acessorios', icon: 'Laptop' },
  { name: 'Eletrodomésticos', slug: 'eletrodomesticos', icon: 'Refrigerator' },
  { name: 'Móveis e Decoração', slug: 'moveis-e-decoracao', icon: 'Sofa' },
  { name: 'Ferramentas e Construção', slug: 'ferramentas-e-construcao', icon: 'Wrench' },
  { name: 'Agro e Rural', slug: 'agro-e-rural', icon: 'Tractor' },
  { name: 'Esportes e Lazer', slug: 'esportes-e-lazer', icon: 'Bike' },
  { name: 'Moda e Calçados', slug: 'moda-e-calcados', icon: 'Shirt' },
  { name: 'Bebês e Crianças', slug: 'bebes-e-criancas', icon: 'Baby' },
  { name: 'Outros', slug: 'outros', icon: 'Package' },
];

async function main() {
  console.log('Seeding categories...');
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon },
    });
  }
  console.log('Categories seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

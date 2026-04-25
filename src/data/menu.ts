import xBurguer from "@/assets/x-burguer.jpg";
import xTudo from "@/assets/x-tudo.jpg";
import xFrango from "@/assets/x-frango.jpg";
import sucoLaranja from "@/assets/suco-laranja.jpg";
import sucoAcerola from "@/assets/suco-acerola.jpg";
import cocaCola from "@/assets/coca-cola.jpg";
import guarana from "@/assets/guarana.jpg";

export type Category = {
  id: string;
  name: string;
  emoji: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
};

export const categories: Category[] = [
  { id: "sanduiches", name: "Sanduíches", emoji: "🍔" },
  { id: "sucos", name: "Sucos", emoji: "🧃" },
  { id: "refrigerantes", name: "Refrigerantes", emoji: "🥤" },
  { id: "bebidas", name: "Bebidas", emoji: "🍺" },
];

export const products: Product[] = [
  {
    id: "x-burguer",
    name: "X-Burguer",
    description: "Pão brioche, hambúrguer artesanal, queijo, alface e tomate.",
    price: 12.9,
    image: xBurguer,
    categoryId: "sanduiches",
  },
  {
    id: "x-tudo",
    name: "X-Tudo",
    description: "O completão: hambúrguer, ovo, bacon, presunto, queijo e salada.",
    price: 18.9,
    image: xTudo,
    categoryId: "sanduiches",
  },
  {
    id: "x-frango",
    name: "X-Frango",
    description: "Filé de frango crocante, queijo derretido, alface e tomate.",
    price: 14.9,
    image: xFrango,
    categoryId: "sanduiches",
  },
  {
    id: "suco-laranja",
    name: "Suco de Laranja",
    description: "Suco natural feito na hora, 400ml.",
    price: 6.0,
    image: sucoLaranja,
    categoryId: "sucos",
  },
  {
    id: "suco-acerola",
    name: "Suco de Acerola",
    description: "Refrescante, rico em vitamina C, 400ml.",
    price: 5.5,
    image: sucoAcerola,
    categoryId: "sucos",
  },
  {
    id: "coca-cola",
    name: "Coca-Cola Lata",
    description: "Coca-Cola gelada, 350ml.",
    price: 5.0,
    image: cocaCola,
    categoryId: "refrigerantes",
  },
  {
    id: "guarana",
    name: "Guaraná",
    description: "Guaraná Antarctica gelado, 350ml.",
    price: 4.5,
    image: guarana,
    categoryId: "refrigerantes",
  },
  {
    id: "agua-mineral",
    name: "Água Mineral",
    description: "Água sem gás, 500ml.",
    price: 3.5,
    image: guarana,
    categoryId: "bebidas",
  },
  {
    id: "cerveja-lata",
    name: "Cerveja Lata",
    description: "Cerveja gelada, 350ml.",
    price: 7.0,
    image: cocaCola,
    categoryId: "bebidas",
  },
];

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const RESTAURANT = {
  name: "Espetinho do João",
  whatsapp: "5588992778979",
};
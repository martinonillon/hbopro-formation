export interface Quote {
  id: number;
  text: string;
  author: string;
  source?: string;
  theme?: string;
}

export const DAILY_QUOTES: Quote[] = [
  {
    id: 1,
    text: "Pour ce qui est de l'avenir, il ne s'agit pas de le prévoir, mais de le rendre possible.",
    author: "Antoine de Saint-Exupéry",
    theme: "Anticipation"
  },
  {
    id: 2,
    text: "Le travail d'équipe est le secret qui permet à des gens ordinaires d'obtenir des résultats extraordinaires.",
    author: "Andrew Carnegie",
    theme: "Cohésion"
  },
  {
    id: 3,
    text: "La meilleure façon de prédire l'avenir, c'est de le créer.",
    author: "Peter Drucker",
    theme: "Vision"
  },
  {
    id: 4,
    text: "Se réunir est un début, rester ensemble est un progrès, travailler ensemble est la réussite.",
    author: "Henry Ford",
    theme: "Collaboration"
  },
  {
    id: 5,
    text: "Un problème bien posé est à moitié résolu.",
    author: "Henri Poincaré",
    theme: "Méthode"
  },
  {
    id: 6,
    text: "Le sourire est le chemin le plus court entre deux personnes.",
    author: "Victor Borge",
    theme: "Bonne humeur"
  },
  {
    id: 7,
    text: "Gouverner, c'est prévoir ; et ne rien prévoir, c'est courir à sa perte.",
    author: "Émile de Girardin",
    theme: "Anticipation"
  },
  {
    id: 8,
    text: "La clarté et la simplicité sont les clés de l'efficacité opérationnelle.",
    author: "Lao Tseu",
    theme: "Organisation"
  },
  {
    id: 9,
    text: "L'excellence n'est pas un acte, c'est une habitude.",
    author: "Aristote",
    theme: "Rigueur"
  },
  {
    id: 10,
    text: "La bonne humeur est un bon bouclier contre les aléas du quotidien.",
    author: "Proverbe contemporain",
    theme: "Sérénité"
  },
  {
    id: 11,
    text: "Rien de grand ne s'est accompli dans le monde sans passion.",
    author: "Georg Wilhelm Friedrich Hegel",
    theme: "Engagement"
  },
  {
    id: 12,
    text: "Donner l'exemple n'est pas le principal moyen d'influencer les autres, c'est le seul.",
    author: "Albert Schweitzer",
    theme: "Leadership"
  },
  {
    id: 13,
    text: "L'anticipation est la politesse de l'organisation.",
    author: "Sagesse professionnelle",
    theme: "Anticipation"
  },
  {
    id: 14,
    text: "Le succès, c'est d'aller d'échec en échec sans perdre son enthousiasme.",
    author: "Winston Churchill",
    theme: "Persévérance"
  },
  {
    id: 15,
    text: "Ce qui est fait avec soin porte toujours ses fruits au moment opportun.",
    author: "Marc Aurèle",
    theme: "Précision"
  },
  {
    id: 16,
    text: "La persévérance transforme l'effort en succès durable.",
    author: "Confucius",
    theme: "Persévérance"
  },
  {
    id: 17,
    text: "Chaque matin nous renaissons. Ce que nous faisons aujourd'hui est ce qui importe le plus.",
    author: "Bouddha",
    theme: "Focus quotidien"
  },
  {
    id: 18,
    text: "La rigueur vient à bout de tous les obstacles.",
    author: "Léonard de Vinci",
    theme: "Rigueur"
  },
  {
    id: 19,
    text: "Dans toute entreprise, la communication fluide est le ciment de la réussite collective.",
    author: "Paul Watzlawick",
    theme: "Communication"
  },
  {
    id: 20,
    text: "Il n'y a pas de vent favorable pour celui qui ne sait où il va.",
    author: "Sénèque",
    theme: "Objectif"
  },
  {
    id: 21,
    text: "L'optimisme est la foi qui mène au succès. Rien ne peut se faire sans espoir et confiance.",
    author: "Helen Keller",
    theme: "Optimisme"
  },
  {
    id: 22,
    text: "Un voyage de mille lieues commence toujours par un premier pas.",
    author: "Lao Tseu",
    theme: "Action"
  },
  {
    id: 23,
    text: "La qualité n'est jamais le fruit du hasard ; elle est toujours le résultat d'un effort intelligent.",
    author: "John Ruskin",
    theme: "Qualité"
  },
  {
    id: 24,
    text: "Tout ce qui mérite d'être fait mérite d'être bien fait.",
    author: "Lord Chesterfield",
    theme: "Excellence"
  },
  {
    id: 25,
    text: "Faites que le rêve dévore votre vie afin que la vie ne dévore pas votre rêve.",
    author: "Antoine de Saint-Exupéry",
    theme: "Inspiration"
  },
  {
    id: 26,
    text: "La joie est le soleil des âmes ; elle illumine celui qui la possède et réchauffe tous ceux qui en reçoivent les rayons.",
    author: "Carl Reiche",
    theme: "Bonne humeur"
  },
  {
    id: 27,
    text: "La valeur d'une idée dépend de son utilisation.",
    author: "Thomas Edison",
    theme: "Pragmatisme"
  },
  {
    id: 28,
    text: "Le talent gagne des matchs, mais le travail d'équipe et l'intelligence gagnent des championnats.",
    author: "Michael Jordan",
    theme: "Esprit d'équipe"
  },
  {
    id: 29,
    text: "Prenez soin des minutes et les heures prendront soin d'elles-mêmes.",
    author: "Lord Chesterfield",
    theme: "Gestion du temps"
  },
  {
    id: 30,
    text: "La patience et la méthode viennent à bout de tout.",
    author: "Jean de La Fontaine",
    theme: "Méthode"
  },
  {
    id: 31,
    text: "Un sourire chaleureux est le langage universel de la bienveillance.",
    author: "William Arthur Ward",
    theme: "Bienveillance"
  }
];

/**
 * Returns a deterministic quote for the given date (default today).
 */
export function getDailyQuote(date: Date = new Date()): Quote {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diffInDays = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const index = Math.abs(diffInDays) % DAILY_QUOTES.length;
  return DAILY_QUOTES[index];
}

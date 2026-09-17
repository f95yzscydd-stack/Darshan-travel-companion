const porkRiskTerms = [
  'pork', 'porco', 'presunto', 'chouriço', 'chourico', 'enchidos',
  'bifana', 'lard', 'pork fat', 'mixed grill', 'pork broth', 'cerdo', 'jamón', 'sobrasada', 'manteca', 'ensaïmada', 'ensaimada'
];

export const NO_PORK_MESSAGE =
  'Ask if sauces, broths, petiscos, or specials contain chouriço, presunto, pork fat, lard, or pork-based stock.';

export const hasPorkRisk = (...values: Array<string | string[] | undefined>) => {
  const text = values.flatMap(value => Array.isArray(value) ? value : [value ?? '']).join(' ').toLowerCase();
  return porkRiskTerms.some(term => text.includes(term));
};

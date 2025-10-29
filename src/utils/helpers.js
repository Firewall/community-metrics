import { getMaintainersList } from './maintainers.js';
import { config } from '../config.js';

export function isCommunityContributor(author) {
  const maintainers = getMaintainersList();
  return author && !maintainers.includes(author.login);
}

export function isWithinLastMonth(dateString) {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - config.lookbackMonths);
  return new Date(dateString) >= lastMonth;
}

export function calculateRate(numerator, denominator) {
  return denominator > 0 ? ((numerator / denominator) * 100).toFixed(1) : 0;
}

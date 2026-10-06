export const formatCurrency = (value) => {
  return `₹${Number(value).toLocaleString('en-IN')}`;
};
export default formatCurrency;

/**
 * Utility to convert numeric currency amounts to words in Indian English format.
 * Example: 524.96 -> "Five Hundred Twenty-Four Rupees and Ninety-Six Paise Only"
 * Example: 1000 -> "One Thousand Rupees Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

const convertLessThanThousand = (num) => {
  if (num === 0) return '';
  let str = '';

  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }

  if (num >= 20) {
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    str += TENS[ten] + (unit ? '-' + ONES[unit] : '') + ' ';
  } else if (num > 0) {
    str += ONES[num] + ' ';
  }

  return str.trim();
};

const convertIntegerToWords = (num) => {
  if (num === 0) return 'Zero';

  let str = '';

  // Crores (1,00,00,000)
  if (num >= 10000000) {
    str += convertLessThanThousand(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }

  // Lakhs (1,00,000)
  if (num >= 100000) {
    str += convertLessThanThousand(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }

  // Thousands (1,000)
  if (num >= 1000) {
    str += convertLessThanThousand(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }

  // Remaining < 1000
  if (num > 0) {
    str += convertLessThanThousand(num);
  }

  return str.trim();
};

export const amountToWords = (amount) => {
  const numericVal = parseFloat(amount);
  if (isNaN(numericVal) || numericVal < 0) {
    return 'Zero Rupees Only';
  }

  const rounded = Math.round(numericVal * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const rupeesWords = convertIntegerToWords(rupees);
  const paiseWords = paise > 0 ? convertIntegerToWords(paise) : '';

  let result = `${rupeesWords} ${rupees === 1 ? 'Rupee' : 'Rupees'}`;

  if (paise > 0) {
    result += ` and ${paiseWords} ${paise === 1 ? 'Paise' : 'Paise'}`;
  }

  result += ' Only';
  return result;
};

export default amountToWords;

export interface PayrollCalculationInput {
  basicSalary: number;
  overtime: number;
  allowances: number;
  maritalStatus?: 'single' | 'married';
}

export interface PayrollCalculationResult {
  grossPay: number;
  ssfDeduction: number;
  taxableIncome: number;
  taxAmount: number;
  netPay: number;
}

export function calculateNepalPayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const { basicSalary, overtime, allowances, maritalStatus = 'single' } = input;
  
  // 1. Gross Pay
  const grossPay = basicSalary + overtime + allowances;
  
  // 2. SSF Deduction (11% of Basic Salary)
  const ssfDeduction = basicSalary * 0.11;
  
  // 3. Taxable Income (Annualized for Tax Bracket Calculation)
  // In Nepal, SSF contribution is tax exempt up to a limit, we assume full exemption for simplicity.
  const monthlyTaxableIncome = grossPay - ssfDeduction;
  const annualTaxableIncome = monthlyTaxableIncome * 12;
  
  // 4. Progressive Income Tax Calculation (Simplified 2023/24 Brackets)
  let annualTax = 0;
  let remainingIncome = annualTaxableIncome;
  
  const baseBracketLimit = maritalStatus === 'married' ? 600000 : 500000;
  
  // First Bracket (1%)
  if (remainingIncome > 0) {
    const taxableInBracket = Math.min(remainingIncome, baseBracketLimit);
    annualTax += taxableInBracket * 0.01;
    remainingIncome -= taxableInBracket;
  }
  
  // Second Bracket (10% on next 200k/300k)
  const secondBracketLimit = maritalStatus === 'married' ? 200000 : 200000;
  if (remainingIncome > 0) {
    const taxableInBracket = Math.min(remainingIncome, secondBracketLimit);
    annualTax += taxableInBracket * 0.10;
    remainingIncome -= taxableInBracket;
  }
  
  // Third Bracket (20% on next 300k)
  const thirdBracketLimit = 300000;
  if (remainingIncome > 0) {
    const taxableInBracket = Math.min(remainingIncome, thirdBracketLimit);
    annualTax += taxableInBracket * 0.20;
    remainingIncome -= taxableInBracket;
  }
  
  // Fourth Bracket (30% on next 1000k)
  const fourthBracketLimit = 1000000;
  if (remainingIncome > 0) {
    const taxableInBracket = Math.min(remainingIncome, fourthBracketLimit);
    annualTax += taxableInBracket * 0.30;
    remainingIncome -= taxableInBracket;
  }
  
  // Fifth Bracket (36% on remaining above 20L)
  if (remainingIncome > 0) {
    annualTax += remainingIncome * 0.36;
  }
  
  const monthlyTax = annualTax / 12;
  
  // 5. Net Pay
  const netPay = grossPay - ssfDeduction - monthlyTax;
  
  return {
    grossPay,
    ssfDeduction,
    taxableIncome: monthlyTaxableIncome,
    taxAmount: monthlyTax,
    netPay
  };
}

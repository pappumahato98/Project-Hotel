import { FinancialStatements } from "../FinancialStatements";

export function FinancialReportingService({ isReadOnly }: { isReadOnly?: boolean }) {
  return (
    <div className="space-y-6">
      <FinancialStatements isReadOnly={isReadOnly} />
    </div>
  );
}

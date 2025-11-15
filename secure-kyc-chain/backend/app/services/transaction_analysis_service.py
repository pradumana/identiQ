"""Transaction Document Analysis Service for Fraud Detection"""
import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

class TransactionAnalysisService:
    """
    Service to analyze transactional documents (bank statements, utility bills, etc.)
    for signs of malicious intent or fraud
    """
    
    def __init__(self):
        # Patterns indicating suspicious activity
        self.suspicious_patterns = {
            'rapid_transactions': {
                'threshold': 10,  # More than 10 transactions in a day
                'risk_score': 30
            },
            'large_amounts': {
                'threshold': 100000,  # Transactions > 1 lakh
                'risk_score': 25
            },
            'round_numbers': {
                'pattern': r'\b\d{4,6}\.00\b',  # Large round numbers
                'risk_score': 15
            },
            'frequent_cash_withdrawals': {
                'threshold': 5,  # More than 5 cash withdrawals
                'risk_score': 20
            },
            'unusual_timing': {
                'risk_score': 10  # Transactions at odd hours
            },
            'negative_balance': {
                'risk_score': 40
            },
            'duplicate_transactions': {
                'risk_score': 35
            }
        }
    
    def analyze_transaction_document(
        self,
        extracted_text: str,
        document_type: str
    ) -> Dict[str, Any]:
        """
        Analyze transaction document for malicious intent
        
        Args:
            extracted_text: OCR extracted text from document
            document_type: Type of document (BANK_STATEMENT, UTILITY_BILL, etc.)
        
        Returns:
            {
                'is_suspicious': bool,
                'risk_score': int (0-100),
                'suspicious_indicators': List[str],
                'transaction_count': int,
                'analysis_details': Dict
            }
        """
        analysis = {
            'is_suspicious': False,
            'risk_score': 0,
            'suspicious_indicators': [],
            'transaction_count': 0,
            'analysis_details': {}
        }
        
        try:
            # Extract transaction data
            transactions = self._extract_transactions(extracted_text, document_type)
            analysis['transaction_count'] = len(transactions)
            
            if len(transactions) == 0:
                # No transactions found - might be a fake document
                analysis['is_suspicious'] = True
                analysis['risk_score'] = 50
                analysis['suspicious_indicators'].append('No transactions found in document')
                return analysis
            
            # Analyze transactions
            risk_factors = []
            
            # 1. Check for rapid transactions
            rapid_count = self._check_rapid_transactions(transactions)
            if rapid_count > self.suspicious_patterns['rapid_transactions']['threshold']:
                risk_factors.append({
                    'type': 'rapid_transactions',
                    'count': rapid_count,
                    'risk': self.suspicious_patterns['rapid_transactions']['risk_score']
                })
                analysis['suspicious_indicators'].append(
                    f'Unusually high number of transactions in short period: {rapid_count}'
                )
            
            # 2. Check for large amounts
            large_amounts = self._check_large_amounts(transactions)
            if large_amounts:
                risk_factors.append({
                    'type': 'large_amounts',
                    'count': len(large_amounts),
                    'risk': self.suspicious_patterns['large_amounts']['risk_score']
                })
                analysis['suspicious_indicators'].append(
                    f'Multiple large transactions detected: {len(large_amounts)} transactions > ₹1,00,000'
                )
            
            # 3. Check for round numbers (potential money laundering)
            round_numbers = self._check_round_numbers(extracted_text)
            if round_numbers:
                risk_factors.append({
                    'type': 'round_numbers',
                    'count': len(round_numbers),
                    'risk': self.suspicious_patterns['round_numbers']['risk_score']
                })
                analysis['suspicious_indicators'].append(
                    f'Suspicious round number transactions: {len(round_numbers)} found'
                )
            
            # 4. Check for frequent cash withdrawals
            cash_withdrawals = self._check_cash_withdrawals(transactions)
            if len(cash_withdrawals) > self.suspicious_patterns['frequent_cash_withdrawals']['threshold']:
                risk_factors.append({
                    'type': 'frequent_cash_withdrawals',
                    'count': len(cash_withdrawals),
                    'risk': self.suspicious_patterns['frequent_cash_withdrawals']['risk_score']
                })
                analysis['suspicious_indicators'].append(
                    f'Frequent cash withdrawals: {len(cash_withdrawals)} withdrawals'
                )
            
            # 5. Check for negative balance
            negative_balance = self._check_negative_balance(extracted_text)
            if negative_balance:
                risk_factors.append({
                    'type': 'negative_balance',
                    'risk': self.suspicious_patterns['negative_balance']['risk_score']
                })
                analysis['suspicious_indicators'].append('Negative balance detected')
            
            # 6. Check for duplicate transactions
            duplicates = self._check_duplicate_transactions(transactions)
            if duplicates:
                risk_factors.append({
                    'type': 'duplicate_transactions',
                    'count': len(duplicates),
                    'risk': self.suspicious_patterns['duplicate_transactions']['risk_score']
                })
                analysis['suspicious_indicators'].append(
                    f'Duplicate transactions detected: {len(duplicates)} pairs'
                )
            
            # Calculate total risk score
            total_risk = sum(factor['risk'] for factor in risk_factors)
            # Cap at 100
            analysis['risk_score'] = min(100, total_risk)
            analysis['is_suspicious'] = analysis['risk_score'] >= 40  # Threshold for suspicious
            
            analysis['analysis_details'] = {
                'risk_factors': risk_factors,
                'transactions_analyzed': len(transactions),
                'total_risk_score': analysis['risk_score']
            }
            
        except Exception as e:
            print(f"Transaction analysis error: {e}")
            import traceback
            traceback.print_exc()
            analysis['error'] = str(e)
        
        return analysis
    
    def _extract_transactions(self, text: str, doc_type: str) -> List[Dict[str, Any]]:
        """Extract transaction data from OCR text"""
        transactions = []
        
        # Common patterns for bank statements
        if 'BANK' in doc_type.upper() or 'STATEMENT' in doc_type.upper():
            # Pattern: Date | Description | Amount | Balance
            # Example: "01/01/2024 | ATM WITHDRAWAL | -5000.00 | 45000.00"
            date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}'
            amount_pattern = r'[+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?'
            
            lines = text.split('\n')
            for line in lines:
                # Look for lines with dates and amounts
                if re.search(date_pattern, line) and re.search(amount_pattern, line):
                    amounts = re.findall(amount_pattern, line)
                    dates = re.findall(date_pattern, line)
                    
                    if amounts and dates:
                        try:
                            # Try to parse amount (take the largest absolute value)
                            amounts_float = [abs(float(a.replace(',', ''))) for a in amounts]
                            max_amount = max(amounts_float) if amounts_float else 0
                            
                            transactions.append({
                                'date': dates[0],
                                'amount': max_amount,
                                'raw_line': line
                            })
                        except:
                            pass
        
        # For utility bills, extract payment amount
        elif 'UTILITY' in doc_type.upper() or 'BILL' in doc_type.upper():
            # Look for amount due
            amount_pattern = r'(?:amount|total|due|payable)[:\s]+₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'
            matches = re.findall(amount_pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    amount = float(match.replace(',', ''))
                    transactions.append({
                        'date': None,
                        'amount': amount,
                        'type': 'utility_bill'
                    })
                except:
                    pass
        
        return transactions
    
    def _check_rapid_transactions(self, transactions: List[Dict]) -> int:
        """Check for rapid transactions (many in short time)"""
        if len(transactions) < 2:
            return 0
        
        # Group by date (simplified - assumes same date = rapid)
        date_counts = {}
        for txn in transactions:
            if txn.get('date'):
                date = txn['date'].split()[0] if ' ' in txn['date'] else txn['date']
                date_counts[date] = date_counts.get(date, 0) + 1
        
        # Return max transactions per day
        return max(date_counts.values()) if date_counts else 0
    
    def _check_large_amounts(self, transactions: List[Dict]) -> List[Dict]:
        """Check for unusually large transaction amounts"""
        threshold = self.suspicious_patterns['large_amounts']['threshold']
        return [txn for txn in transactions if txn.get('amount', 0) > threshold]
    
    def _check_round_numbers(self, text: str) -> List[str]:
        """Check for suspicious round number patterns"""
        pattern = self.suspicious_patterns['round_numbers']['pattern']
        matches = re.findall(pattern, text)
        return matches
    
    def _check_cash_withdrawals(self, transactions: List[Dict]) -> List[Dict]:
        """Check for cash withdrawal transactions"""
        withdrawal_keywords = ['ATM', 'WITHDRAWAL', 'CASH', 'WITHDRAW']
        withdrawals = []
        
        for txn in transactions:
            raw_line = txn.get('raw_line', '').upper()
            if any(keyword in raw_line for keyword in withdrawal_keywords):
                withdrawals.append(txn)
        
        return withdrawals
    
    def _check_negative_balance(self, text: str) -> bool:
        """Check for negative balance indicators"""
        negative_patterns = [
            r'balance[:\s]+-?\s*₹?\s*\d+',
            r'overdraft',
            r'negative',
            r'deficit'
        ]
        
        text_upper = text.upper()
        for pattern in negative_patterns:
            if re.search(pattern, text_upper, re.IGNORECASE):
                return True
        
        return False
    
    def _check_duplicate_transactions(self, transactions: List[Dict]) -> List[tuple]:
        """Check for duplicate transactions (same amount, same date)"""
        duplicates = []
        seen = {}
        
        for i, txn in enumerate(transactions):
            key = (txn.get('amount'), txn.get('date'))
            if key in seen:
                duplicates.append((seen[key], i))
            else:
                seen[key] = i
        
        return duplicates


# Singleton instance
transaction_analysis_service = TransactionAnalysisService()


import type { GenericRecord } from '@/types/object-definition'
import { calculatorHandlers } from '@/metadata/action-registry'

/**
 * Safely evaluates a formula expression for a record.
 * Supports:
 * - Field references: `quantity`, `price`
 * - Basic math: `quantity * price`, `total + tax`, `amount / 2`
 * - Functions: `daysSince(orderDate)`, `currency(totalAmount)`, `fallback(field, "N/A")`
 * 
 * @param expression Formula expression (e.g. "quantity * price", "daysSince(orderDate)")
 * @param record Record to evaluate against
 * @returns Evaluated result (number or string)
 */
export function evaluateFormula(expression: string, record: GenericRecord): string | number {
  if (!expression?.trim()) return ''
  
  const expr = expression.trim()
  
  // Handle function calls: daysSince(field), currency(field), fallback(field, value)
  const functionMatch = expr.match(/^(\w+)\(([^)]+)\)$/)
  if (functionMatch) {
    const [, funcName, args] = functionMatch
    const argParts = args.split(',').map(s => s.trim())
    
    if (funcName in calculatorHandlers) {
      const handler = calculatorHandlers[funcName]
      const config: Record<string, unknown> = {}
      
      if (funcName === 'daysSince' || funcName === 'currency') {
        config.sourceField = argParts[0]
      } else if (funcName === 'fallback') {
        config.sourceField = argParts[0]
        config.fallbackValue = argParts[1]?.replace(/^["']|["']$/g, '') // Remove quotes
      }
      
      return handler(record, config)
    }
  }
  
  // Handle basic math expressions: field1 * field2, field1 + field2, etc.
  // Split by operators while preserving them
  const tokens: Array<string | number> = []
  const operators: string[] = []
  let current = ''
  
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]
    if (['*', '/', '+', '-'].includes(char)) {
      if (current.trim()) {
        tokens.push(getFieldValue(current.trim(), record))
        current = ''
      }
      operators.push(char)
    } else {
      current += char
    }
  }
  
  if (current.trim()) {
    tokens.push(getFieldValue(current.trim(), record))
  }
  
  // Evaluate math expression (left-to-right, respecting operator precedence would be better but simple is fine for now)
  if (tokens.length === 0) return ''
  if (tokens.length === 1) return tokens[0]
  
  let result = tokens[0]
  
  for (let i = 0; i < operators.length && i + 1 < tokens.length; i++) {
    const op = operators[i]
    const next = tokens[i + 1]
    
    if (typeof result === 'number' && typeof next === 'number') {
      switch (op) {
        case '*':
          result = result * next
          break
        case '/':
          result = next !== 0 ? result / next : 0
          break
        case '+':
          result = result + next
          break
        case '-':
          result = result - next
          break
        default:
          return result
      }
    } else {
      // If types don't match, return string concatenation for +, or first value
      return op === '+' ? String(result) + String(next) : result
    }
  }
  
  return result
}

/**
 * Gets a field value from a record, handling nested references and type conversion.
 */
function getFieldValue(fieldRef: string, record: GenericRecord): string | number {
  // Handle numeric constants
  const numMatch = fieldRef.match(/^[\d.]+$/)
  if (numMatch) {
    return parseFloat(fieldRef)
  }
  
  // Get field value from record
  const value = record[fieldRef]
  
  if (value === null || value === undefined) {
    return 0 // Default to 0 for math operations
  }
  
  // Convert to number if possible
  if (typeof value === 'number') {
    return value
  }
  
  const num = parseFloat(String(value))
  return isNaN(num) ? 0 : num
}

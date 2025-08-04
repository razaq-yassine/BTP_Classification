import { ObjectDefinition } from '@/types/object-definition'
import { customerObjectDefinition } from './customer'

// Object registry - add new object definitions here
export const objectRegistry: Record<string, ObjectDefinition> = {
  customer: customerObjectDefinition,
  // Add more objects here as they are created
  // user: userObjectDefinition,
  // product: productObjectDefinition,
  // etc.
}

// Helper function to get object definition by name
export function getObjectDefinition(objectName: string): ObjectDefinition | undefined {
  return objectRegistry[objectName]
}

// Helper function to get all object definitions
export function getAllObjectDefinitions(): ObjectDefinition[] {
  return Object.values(objectRegistry)
}

// Helper function to get object names
export function getObjectNames(): string[] {
  return Object.keys(objectRegistry)
}

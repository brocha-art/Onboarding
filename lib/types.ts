// ----------------------------------------------------------------
// Shared types for the portal wizard state
// ----------------------------------------------------------------

export type ProductType = 'Obra original' | 'Réplica / Print' | 'Producto artístico'

export type ShippingOption =
  | 'Solo mi país'
  | 'Varios países de LATAM'
  | 'Internacional (todo el mundo)'
  | 'Seleccionar países específicos'
  | null

export interface Product {
  id: string
  type: ProductType
  title: string
  description: string
  technique: string
  year: string
  dimensions: string
  price: string
  stock: string
  imageFiles: File[]
  imageUrls: string[]
  shippingOption: ShippingOption
  shippingCountries: string[]
  shippingPolicy: string
}

export interface Session {
  id: string
  title: string
  description: string
  videoFile: File | null
  videoName: string
}

export interface Module {
  id: string
  title: string
  description: string
  sessions: Session[]
}

export interface Resource {
  id: string
  name: string
  type: string
  file: File | null
  fileName: string
  url: string
}

export interface Studio {
  title: string
  description: string
  level: string
  price: string
  coverFiles: File[]
  coverUrls: string[]
  introVideoFile: File | null
  introVideoName: string
  modules: Module[]
  resources: Resource[]
}

export interface PortalState {
  step: 1 | 2 | 3 | 4 | 5 // 5 = success
  // Step 1 – Profile
  artistName: string
  country: string
  bio: string
  profilePhotoFile: File | null
  profilePhotoUrl: string
  instagram: string
  website: string
  // Step 2 – Sections
  sections: { tienda: boolean; estudios: boolean }
  // Step 3a – Tienda
  products: Product[]
  // Step 3b – Estudios
  studio: Studio
  // Internal nav: when both sections, track which content screen
  contentScreen: 'tienda' | 'estudios'
}

export const initialStudio: Studio = {
  title: '',
  description: '',
  level: '',
  price: '',
  coverFiles: [],
  coverUrls: [],
  introVideoFile: null,
  introVideoName: '',
  modules: [],
  resources: [],
}

export const initialState: PortalState = {
  step: 2,
  artistName: '',
  country: '',
  bio: '',
  profilePhotoFile: null,
  profilePhotoUrl: '',
  instagram: '',
  website: '',
  sections: { tienda: false, estudios: false },
  products: [],
  studio: { ...initialStudio },
  contentScreen: 'tienda',
}

export function makeProduct(): Product {
  return {
    id: crypto.randomUUID(),
    type: 'Obra original',
    title: '',
    description: '',
    technique: '',
    year: '',
    dimensions: '',
    price: '',
    stock: '',
    imageFiles: [],
    imageUrls: [],
    shippingOption: null,
    shippingCountries: [],
    shippingPolicy: '',
  }
}

export function makeModule(): Module {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    sessions: [],
  }
}

export function makeSession(): Session {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    videoFile: null,
    videoName: '',
  }
}

export function makeResource(): Resource {
  return {
    id: crypto.randomUUID(),
    name: '',
    type: '',
    file: null,
    fileName: '',
    url: '',
  }
}

export const COUNTRIES = [
  'Colombia', 'México', 'Argentina', 'Chile', 'Perú', 'Venezuela',
  'Ecuador', 'Bolivia', 'Uruguay', 'Paraguay', 'Brasil', 'Guatemala',
  'Honduras', 'Costa Rica', 'Panamá', 'Cuba', 'El Salvador',
  'Nicaragua', 'República Dominicana',
]

export const LATAM = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica',
  'Cuba', 'Ecuador', 'El Salvador', 'Guatemala', 'Honduras', 'México',
  'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'República Dominicana',
  'Uruguay', 'Venezuela',
]

export const INTL = [
  'Estados Unidos', 'España', 'Francia', 'Alemania', 'Italia',
  'Reino Unido', 'Canadá', 'Australia', 'Japón', 'China',
]

export const LEVELS = ['Principiante', 'Intermedio', 'Avanzado', 'Todos los niveles']

export const RESOURCE_TYPES = [
  'PDF',
  'Plantilla descargable',
  'Link externo',
  'Lista de materiales',
  'Imagen de referencia',
  'Otro',
]

export const SHIPPING_OPTIONS: ShippingOption[] = [
  'Solo mi país',
  'Varios países de LATAM',
  'Internacional (todo el mundo)',
  'Seleccionar países específicos',
]

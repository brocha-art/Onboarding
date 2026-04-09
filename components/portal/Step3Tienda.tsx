'use client'

import { useRef, useState } from 'react'
import type { PortalState, Product, ShippingOption } from '@/lib/types'
import { makeProduct, LATAM, INTL, SHIPPING_OPTIONS } from '@/lib/types'

interface Step3TiendaProps {
  state: PortalState
  update: (patch: Partial<PortalState>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step3Tienda({ state, update, onNext, onBack }: Step3TiendaProps) {
  function addProduct() {
    const p = makeProduct()
    update({ products: [...state.products, p] })
  }

  function updateProduct(id: string, patch: Partial<Product>) {
    update({ products: state.products.map((p) => p.id === id ? { ...p, ...patch } : p) })
  }

  function removeProduct(id: string) {
    update({ products: state.products.filter((p) => p.id !== id) })
  }

  return (
    <div className="screen-anim">
      <div className="screen-title">Tu <span>Tienda</span></div>
      <div className="screen-sub">Registra uno o varios productos en este envío.</div>

      {state.products.map((product, idx) => (
        <ProductCard
          key={product.id}
          product={product}
          index={idx}
          canRemove={state.products.length > 1}
          onChange={(patch) => updateProduct(product.id, patch)}
          onRemove={() => removeProduct(product.id)}
        />
      ))}

      <button
        className="btn btn-ghost"
        onClick={addProduct}
        style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed', marginBottom: 16 }}
      >
        + Agregar otro producto
      </button>

      <div className="action-row">
        <button className="btn btn-ghost" onClick={onBack}>← Volver</button>
        <button className="btn btn-primary" onClick={onNext}>Continuar →</button>
      </div>
    </div>
  )
}

// ─── ProductCard ───────────────────────────────────────────────

const PRODUCT_TYPES: Product['type'][] = ['Obra original', 'Réplica / Print', 'Producto artístico']

function ProductCard({
  product,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  product: Product
  index: number
  canRemove: boolean
  onChange: (patch: Partial<Product>) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const isOriginal = product.type === 'Obra original'

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const arr = Array.from(files)
    const urls = arr.map((f) => URL.createObjectURL(f))
    onChange({
      imageFiles: [...product.imageFiles, ...arr],
      imageUrls: [...product.imageUrls, ...urls],
    })
  }

  function removeImage(idx: number) {
    onChange({
      imageFiles: product.imageFiles.filter((_, i) => i !== idx),
      imageUrls: product.imageUrls.filter((_, i) => i !== idx),
    })
  }

  function toggleCountry(country: string) {
    const countries = product.shippingCountries.includes(country)
      ? product.shippingCountries.filter((c) => c !== country)
      : [...product.shippingCountries, country]
    onChange({ shippingCountries: countries })
  }

  return (
    <div className="product-card">
      <div className="product-card-header">
        <span className="product-card-num">Producto {index + 1}</span>
        {canRemove && (
          <button className="product-card-remove" onClick={onRemove}>×</button>
        )}
      </div>

      {/* Tipo */}
      <div className="form-section" style={{ marginBottom: 20 }}>
        <div className="fsect-title">Tipo de producto</div>
        <div className="pill-group">
          {PRODUCT_TYPES.map((t) => (
            <div
              key={t}
              className={`pill ${product.type === t ? 'active' : ''}`}
              onClick={() => onChange({ type: t })}
            >
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Información */}
      <div className="form-section" style={{ marginBottom: 20 }}>
        <div className="fsect-title">Información</div>
        <div className="field">
          <label>Título de la obra</label>
          <input
            type="text"
            placeholder="Ej: Sin título #3"
            value={product.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Descripción <span className="optional-tag">opcional</span></label>
          <textarea
            style={{ minHeight: 70 }}
            placeholder="Inspiración, proceso, significado..."
            value={product.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Técnica / Material</label>
            <input
              type="text"
              placeholder="Ej: Acrílico sobre lienzo"
              value={product.technique}
              onChange={(e) => onChange({ technique: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Año</label>
            <input
              type="number"
              placeholder="2024"
              min={1900}
              max={2099}
              value={product.year}
              onChange={(e) => onChange({ year: e.target.value })}
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Dimensiones</label>
            <input
              type="text"
              placeholder="60 × 80 cm"
              value={product.dimensions}
              onChange={(e) => onChange({ dimensions: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Precio (COP)</label>
            <div className="price-wrap">
              <span className="currency">$</span>
              <input
                type="number"
                placeholder="350.000"
                value={product.price}
                onChange={(e) => onChange({ price: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stock (solo si no es obra original) */}
      {!isOriginal && (
        <div className="form-section" style={{ marginBottom: 20 }}>
          <div className="fsect-title">Stock</div>
          <div className="field">
            <label>Unidades disponibles</label>
            <input
              type="number"
              placeholder="Ej: 10"
              min={1}
              value={product.stock}
              onChange={(e) => onChange({ stock: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Imágenes */}
      <div className="form-section" style={{ marginBottom: 20 }}>
        <div className="fsect-title">Imágenes del producto</div>
        <div
          className={`upload-zone ${dragOver ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="upload-icon">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
          </div>
          <div className="upload-label">Arrastra o selecciona las imágenes</div>
          <div className="upload-hint">Mínimo 2 fotos · JPG, PNG · Máx. 10 MB c/u</div>
        </div>
        {product.imageUrls.length > 0 && (
          <div className="upload-preview">
            {product.imageUrls.map((url, i) => (
              <div key={i} className="preview-thumb">
                <img src={url} alt={`img-${i}`} />
                <button
                  className="remove-btn"
                  onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Envío */}
      <div className="form-section" style={{ marginBottom: 0 }}>
        <div className="fsect-title">Envío</div>
        <div style={{ marginBottom: 14 }}>
          {SHIPPING_OPTIONS.map((opt) => (
            <div
              key={opt}
              className={`shipping-opt ${product.shippingOption === opt ? 'selected' : ''}`}
              onClick={() => onChange({ shippingOption: opt as ShippingOption })}
            >
              <div className="shipping-dot">
                {product.shippingOption === opt && (
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="3" fill="white"/>
                  </svg>
                )}
              </div>
              {opt}
            </div>
          ))}
        </div>

        {/* Country picker */}
        {product.shippingOption === 'Seleccionar países específicos' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 10 }}>
              Selecciona los países
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>LATAM</div>
            <div className="countries-grid">
              {LATAM.map((c) => {
                const checked = product.shippingCountries.includes(c)
                return (
                  <div
                    key={c}
                    className={`country-check ${checked ? 'checked' : ''}`}
                    onClick={() => toggleCountry(c)}
                  >
                    <div className="cc-dot">{checked ? '✓' : ''}</div>
                    {c}
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginTop: 14, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Internacional</div>
            <div className="countries-grid">
              {INTL.map((c) => {
                const checked = product.shippingCountries.includes(c)
                return (
                  <div
                    key={c}
                    className={`country-check ${checked ? 'checked' : ''}`}
                    onClick={() => toggleCountry(c)}
                  >
                    <div className="cc-dot">{checked ? '✓' : ''}</div>
                    {c}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="field">
          <label>Política de envíos <span className="optional-tag">opcional</span></label>
          <textarea
            style={{ minHeight: 80 }}
            placeholder="Tiempos estimados de entrega, empaque, seguimiento, condiciones especiales..."
            value={product.shippingPolicy}
            onChange={(e) => onChange({ shippingPolicy: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}

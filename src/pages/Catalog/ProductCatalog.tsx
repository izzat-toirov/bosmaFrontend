import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../lib/api-client';
import type { ApiListResponse, Product, Variant } from '../../types/api';

function pickDefaultVariant(product: Product): Variant | null {
  const variants = product.variants ?? [];
  if (variants.length === 0) return null;
  return variants[0];
}

export default function ProductCatalog() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<ApiListResponse<Product>>('/products?limit=50');
        if (!mounted) return;
        setProducts(res.data);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load products');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    return products.map((p) => {
      const v = pickDefaultVariant(p);
      return { product: p, variant: v };
    });
  }, [products]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Catalog</h1>
        <div style={{ opacity: 0.7 }}>Choose a product to start designing</div>
      </div>

      {loading ? <div style={{ paddingTop: 16 }}>Loading…</div> : null}

      {error ? (
        <div
          style={{
            marginTop: 16,
            background: '#fee2e2',
            color: '#991b1b',
            padding: 10,
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {cards.map(({ product, variant }) => (
          <div
            key={product.id}
            style={{
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'white',
            }}
          >
            <div
              style={{
                height: 200,
                background: '#f3f4f6',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {variant?.frontImage ? (
                <img
                  src={variant.frontImage}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ opacity: 0.6 }}>No mockup</div>
              )}
            </div>

            <div style={{ padding: 12, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700 }}>{product.name}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{product.category}</div>
              </div>

              <div style={{ opacity: 0.75, fontSize: 13, minHeight: 34 }}>
                {product.description || '—'}
              </div>

              <button
                onClick={() => {
                  const qs = variant?.id ? `?variantId=${variant.id}` : '';
                  navigate(`/designer/${product.id}${qs}`);
                }}
                style={{ padding: 10, fontWeight: 700 }}
              >
                Design
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

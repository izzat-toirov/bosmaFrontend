import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Konva from 'konva';
import { Image as KonvaImage, Layer, Rect, Stage, Text as KonvaText, Transformer } from 'react-konva';
import useImage from 'use-image';

import { toast } from 'sonner';

import { apiGet, apiPost, uploadAsset } from '../../lib/api-client';
import { useAuth } from '../../context/AuthContext';
import { useAuthModal } from '../../context/AuthModalContext';
import type { Product, Variant } from '../../types/api';

type DesignImageItem = {
  id: string;
  type: 'image';
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

type DesignTextItem = {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
};

type DesignObject = DesignImageItem | DesignTextItem;

function parseNumberParam(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function DesignText({
  item,
  isSelected,
  onSelect,
  onChange,
  registerNode,
  safeZone,
}: {
  item: DesignTextItem;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (next: DesignTextItem) => void;
  registerNode: (node: Konva.Node | null) => void;
  safeZone: { x: number; y: number; width: number; height: number };
}) {
  return (
    <KonvaText
      text={item.text}
      x={item.x}
      y={item.y}
      rotation={item.rotation}
      fontSize={item.fontSize}
      fontFamily={item.fontFamily}
      fill={item.fill}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      ref={(node) => registerNode(node)}
      offsetX={(item.text.length * item.fontSize * 0.25) || 0}
      offsetY={item.fontSize * 0.5}
      onDragMove={(e) => {
        const node = e.target;
        const w = node.width();
        const h = node.height();

        const nextX = clamp(node.x(), safeZone.x, safeZone.x + safeZone.width - w);
        const nextY = clamp(node.y(), safeZone.y, safeZone.y + safeZone.height - h);

        node.x(nextX);
        node.y(nextY);
      }}
      onDragEnd={(e) => {
        onChange({
          ...item,
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target as unknown as Konva.Text;
        const scaleX = node.scaleX();
        const nextFontSize = Math.max(12, Math.min(100, item.fontSize * scaleX));
        node.scaleX(1);
        node.scaleY(1);

        onChange({
          ...item,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          fontSize: nextFontSize,
        });
      }}
      opacity={isSelected ? 0.98 : 1}
    />
  );
}

function getVariantIdFromSearch(search: string): number | null {
  const params = new URLSearchParams(search);
  const raw = params.get('variantId');
  return raw ? parseNumberParam(raw) : null;
}

function pickVariant(product: Product, variantId: number | null): Variant | null {
  const variants = product.variants ?? [];
  if (variants.length === 0) return null;
  if (!variantId) return variants[0];
  return variants.find((v) => v.id === variantId) ?? variants[0];
}

export default function DesignerPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const location = useLocation();
  const auth = useAuth();
  const authModal = useAuthModal();

  const parsedProductId = useMemo(() => parseNumberParam(productId), [productId]);
  const variantIdFromSearch = useMemo(
    () => getVariantIdFromSearch(location.search),
    [location.search],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  const [objects, setObjects] = useState<DesignObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());
  const stageWrapRef = useRef<HTMLDivElement | null>(null);

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [shipping, setShipping] = useState({
    customerName: '',
    customerPhone: '',
    region: '',
    address: '',
  });
  const [stagePixelSize, setStagePixelSize] = useState<{ width: number; height: number }>(
    () => ({ width: 520, height: 680 }),
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!parsedProductId) {
        setError('Invalid product id');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const p = await apiGet<Product>(`/products/${parsedProductId}`);
        if (!mounted) return;
        setProduct(p);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load product');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [parsedProductId]);

  const variant = useMemo(
    () => (product ? pickVariant(product, variantIdFromSearch) : null),
    [product, variantIdFromSearch],
  );

  const backgroundUrl = variant?.frontImage ?? null;
  const [bgImage] = useImage(backgroundUrl ?? '', 'anonymous');

  const DESIGN_W = 520;
  const DESIGN_H = 680;
  const STAGE_PADDING_FACTOR = 0.9;

  useEffect(() => {
    const el = stageWrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const maxW = Math.max(1, rect.width) * STAGE_PADDING_FACTOR;
      const maxH = Math.max(1, rect.height) * STAGE_PADDING_FACTOR;

      const ratio = DESIGN_W / DESIGN_H;
      let width = maxW;
      let height = width / ratio;
      if (height > maxH) {
        height = maxH;
        width = height * ratio;
      }

      setStagePixelSize({ width, height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stageScale = useMemo(() => {
    return stagePixelSize.width / DESIGN_W;
  }, [stagePixelSize.width]);

  // Background placement
  const bgDraw = useMemo(() => {
    if (!bgImage) return null;

    const scale = Math.min(DESIGN_W / bgImage.width, DESIGN_H / bgImage.height);
    const width = bgImage.width * scale;
    const height = bgImage.height * scale;

    return {
      x: (DESIGN_W - width) / 2,
      y: (DESIGN_H - height) / 2,
      width,
      height,
      scale,
    };
  }, [bgImage]);

  // Print area / safe zone mapped proportionally onto the drawn background
  const safeZone = useMemo(() => {
    if (!variant || !bgDraw || !bgImage) return null;

    // Variant print-area coords are in the image's pixel space
    const sx = bgDraw.width / bgImage.width;
    const sy = bgDraw.height / bgImage.height;

    return {
      x: bgDraw.x + variant.printAreaLeft * sx,
      y: bgDraw.y + variant.printAreaTop * sy,
      width: variant.printAreaWidth * sx,
      height: variant.printAreaHeight * sy,
    };
  }, [variant, bgDraw, bgImage]);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;

    if (!selectedId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const node = nodeRefs.current.get(selectedId);
    if (!node) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    tr.nodes([node]);
    tr.getLayer()?.batchDraw();
  }, [selectedId, objects]);

  async function onUploadFileSelected(file: File) {
    if (!safeZone) {
      throw new Error('Print area is not ready');
    }

    const asset = await uploadAsset(file);
    const id = `img_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const initialW = Math.min(240, safeZone.width);
    const initialH = initialW;

    const x = safeZone.x + (safeZone.width - initialW) / 2;
    const y = safeZone.y + (safeZone.height - initialH) / 2;

    setObjects((prev) => [
      ...prev,
      {
        id,
        type: 'image',
        url: asset.url,
        x,
        y,
        width: initialW,
        height: initialH,
        rotation: 0,
      },
    ]);
    setSelectedId(id);
  }

  function addText() {
    if (!safeZone) return;
    const id = `txt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setObjects((prev) => [
      ...prev,
      {
        id,
        type: 'text',
        text: 'Your text',
        x: safeZone.x + safeZone.width / 2,
        y: safeZone.y + safeZone.height / 2,
        rotation: 0,
        fontSize: 36,
        fontFamily: 'Roboto',
        fill: '#ffffff',
      },
    ]);
    setSelectedId(id);
  }

  function centerHorizontally() {
    if (!safeZone || !selectedId) return;
    setObjects((prev) =>
      prev.map((it) => {
        if (it.id !== selectedId) return it;
        if (it.type === 'image') {
          const w = it.width;
          return { ...it, x: safeZone.x + (safeZone.width - w) / 2 };
        }
        return { ...it, x: safeZone.x + safeZone.width / 2 };
      }),
    );
  }

  function centerVertically() {
    if (!safeZone || !selectedId) return;
    setObjects((prev) =>
      prev.map((it) => {
        if (it.id !== selectedId) return it;
        if (it.type === 'image') {
          const h = it.height;
          return { ...it, y: safeZone.y + (safeZone.height - h) / 2 };
        }
        return { ...it, y: safeZone.y + safeZone.height / 2 };
      }),
    );
  }

  function deleteSelected() {
    if (!selectedId) return;
    setObjects((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  }

  const selectedObject = useMemo(() => {
    if (!selectedId) return null;
    return objects.find((o) => o.id === selectedId) ?? null;
  }, [objects, selectedId]);

  function updateSelectedText(patch: Partial<DesignTextItem>) {
    if (!selectedId) return;
    setObjects((prev) =>
      prev.map((it) => {
        if (it.id !== selectedId) return it;
        if (it.type !== 'text') return it;
        return { ...it, ...patch };
      }),
    );
  }

  async function exportStagePreviewFile(): Promise<File> {
    const stage = stageRef.current;
    if (!stage) {
      throw new Error('Canvas is not ready');
    }

    if (!product || !variant) {
      throw new Error('Product is not ready');
    }

    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], `design_${product.id}_${variant.id}.png`, { type: blob.type });
  }

  async function doAddToCart() {
    if (!auth.user || auth.status !== 'authenticated') {
      authModal.open({
        tab: 'login',
        title: 'Sign in to add to cart',
        description: 'Login to save your design and add it to your cart.',
        onAuthed: async () => {
          await doAddToCart();
        },
      });
      return;
    }

    if (!product || !variant) {
      toast.error('Product is not ready');
      return;
    }

    if (isAddingToCart) return;

    setIsAddingToCart(true);
    try {
      const previewFile = await exportStagePreviewFile();
      const uploaded = await uploadAsset(previewFile);

      const frontDesign = {
        productId: product.id,
        variantId: variant.id,
        clientDesignId: `${product.id}_${variant.id}_${Date.now()}`,
      };

      await apiPost<unknown, {
        variantId: number;
        quantity: number;
        frontDesign?: any;
        frontPreviewUrl?: string;
      }>(
        '/cart/add',
        {
          variantId: variant.id,
          quantity: 1,
          frontDesign,
          frontPreviewUrl: uploaded.url,
        },
      );

      toast.success('Added to cart');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  }

  function openShippingForOrder() {
    if (!auth.user || auth.status !== 'authenticated') {
      authModal.open({
        tab: 'login',
        title: 'Sign in to order',
        description: 'Login to place your order and track delivery status.',
        onAuthed: async () => {
          openShippingForOrder();
        },
      });
      return;
    }

    if (!product || !variant) {
      toast.error('Product is not ready');
      return;
    }

    setIsShippingOpen(true);
  }

  async function submitOrderNow() {
    if (!product || !variant) {
      toast.error('Product is not ready');
      return;
    }

    if (!shipping.customerName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!shipping.customerPhone.trim()) {
      toast.error('Phone is required');
      return;
    }
    if (!shipping.region.trim()) {
      toast.error('Region is required');
      return;
    }
    if (!shipping.address.trim()) {
      toast.error('Address is required');
      return;
    }

    if (isOrdering) return;

    setIsOrdering(true);
    try {
      const previewFile = await exportStagePreviewFile();
      const uploaded = await uploadAsset(previewFile);

      const frontDesign = {
        objects: JSON.parse(JSON.stringify(objects)),
        productId: product.id,
        variantId: variant.id,
      };

      const quantity = 1;
      const price = Number(variant.price ?? 0);
      const totalPrice = price * quantity;

      await apiPost<unknown, any>('/orders', {
        customerName: shipping.customerName,
        customerPhone: shipping.customerPhone,
        region: shipping.region,
        address: shipping.address,
        totalPrice,
        items: [
          {
            variantId: variant.id,
            quantity,
            price,
            frontDesign,
            frontPreviewUrl: uploaded.url,
          },
        ],
      });

      toast.success('Order created');
      setIsShippingOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create order');
    } finally {
      setIsOrdering(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12, fontWeight: 700 }}>Designer</div>
        <div
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: 10,
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!product || !variant) {
    return <div style={{ padding: 24 }}>No product data</div>;
  }

  return (
    <div className="h-full w-full flex overflow-hidden">

      {/* Left tools */}
      <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-white/10 bg-white/5 p-4">
          <div style={{ fontWeight: 800, fontSize: 16 }}>Tools</div>
          <div style={{ opacity: 0.75, marginTop: 6 }}>{product.name}</div>

          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            <button
              onClick={() => navigate('/catalog')}
              style={{ padding: 10, fontWeight: 700 }}
            >
              Back to catalog
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await onUploadFileSelected(file);
                } catch (err: any) {
                  toast.error(err?.message || 'Upload failed');
                } finally {
                  e.currentTarget.value = '';
                }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: 10, fontWeight: 700 }}
              disabled={!safeZone}
            >
              Upload image
            </button>
            <button
              onClick={addText}
              style={{ padding: 10, fontWeight: 700, opacity: safeZone ? 1 : 0.6 }}
              disabled={!safeZone}
            >
              Add text
            </button>
          </div>
        </aside>

      {/* Canvas center */}
      <main className="flex-1 bg-[#0f1115] overflow-hidden flex items-center justify-center">
        <div
          ref={stageWrapRef}
          className="h-full w-full overflow-hidden flex items-center justify-center"
        >
          <div className="max-h-full max-w-full overflow-hidden flex items-center justify-center">
              <Stage
                width={stagePixelSize.width}
                height={stagePixelSize.height}
                ref={stageRef}
                onMouseDown={(e) => {
                  const stage = e.target.getStage();
                  if (!stage) return;
                  if (e.target === stage) {
                    setSelectedId(null);
                  }
                }}
                onTouchStart={(e) => {
                  const stage = e.target.getStage();
                  if (!stage) return;
                  if (e.target === stage) {
                    setSelectedId(null);
                  }
                }}
              >
                <Layer scaleX={stageScale} scaleY={stageScale}>
                  {/* Background mockup */}
                  {bgImage && bgDraw ? (
                    <KonvaImage
                      image={bgImage}
                      x={bgDraw.x}
                      y={bgDraw.y}
                      width={bgDraw.width}
                      height={bgDraw.height}
                      listening={false}
                    />
                  ) : null}

                  {/* Safe zone guide */}
                  {safeZone ? (
                    <Rect
                      x={safeZone.x}
                      y={safeZone.y}
                      width={safeZone.width}
                      height={safeZone.height}
                      stroke="rgba(0,0,0,0.2)"
                      dash={[6, 6]}
                      strokeWidth={1}
                      listening={false}
                    />
                  ) : null}

                  {safeZone
                    ? objects.map((item) => {
                        if (item.type === 'image') {
                          return (
                            <DesignImage
                              key={item.id}
                              item={item}
                              isSelected={item.id === selectedId}
                              onSelect={() => setSelectedId(item.id)}
                              onChange={(next) => {
                                setObjects((prev) =>
                                  prev.map((it) => (it.id === item.id ? next : it)),
                                );
                              }}
                              registerNode={(node) => {
                                if (!node) {
                                  nodeRefs.current.delete(item.id);
                                  return;
                                }
                                nodeRefs.current.set(item.id, node);
                              }}
                              safeZone={safeZone}
                            />
                          );
                        }

                        return (
                          <DesignText
                            key={item.id}
                            item={item}
                            isSelected={item.id === selectedId}
                            onSelect={() => setSelectedId(item.id)}
                            onChange={(next) => {
                              setObjects((prev) =>
                                prev.map((it) => (it.id === item.id ? next : it)),
                              );
                            }}
                            registerNode={(node) => {
                              if (!node) {
                                nodeRefs.current.delete(item.id);
                                return;
                              }
                              nodeRefs.current.set(item.id, node);
                            }}
                            safeZone={safeZone}
                          />
                        );
                      })
                    : null}

                  <Transformer
                    ref={trRef}
                    rotateEnabled
                    flipEnabled={false}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (!safeZone) return oldBox;

                      const minSize = 20;
                      if (newBox.width < minSize || newBox.height < minSize) {
                        return oldBox;
                      }

                      const maxX = safeZone.x + safeZone.width;
                      const maxY = safeZone.y + safeZone.height;

                      const next = { ...newBox };

                      if (next.x < safeZone.x) next.x = safeZone.x;
                      if (next.y < safeZone.y) next.y = safeZone.y;
                      if (next.x + next.width > maxX) next.x = maxX - next.width;
                      if (next.y + next.height > maxY) next.y = maxY - next.height;

                      return next;
                    }}
                  />
                </Layer>
              </Stage>
          </div>
        </div>
      </main>

      {/* Right options */}
      <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-white/10 bg-white/5 p-4">
          <div style={{ fontWeight: 800, fontSize: 16 }}>Options</div>

          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              Variant: {variant.color} / {variant.size}
            </div>
            <button
              onClick={centerHorizontally}
              disabled={!selectedId}
              style={{ padding: 10, fontWeight: 700, opacity: selectedId ? 1 : 0.6 }}
            >
              Center Horizontally
            </button>
            <button
              onClick={centerVertically}
              disabled={!selectedId}
              style={{ padding: 10, fontWeight: 700, opacity: selectedId ? 1 : 0.6 }}
            >
              Center Vertically
            </button>
            <button
              onClick={deleteSelected}
              disabled={!selectedId}
              style={{ padding: 10, fontWeight: 700, opacity: selectedId ? 1 : 0.6 }}
            >
              Delete Selected
            </button>

          {selectedObject?.type === 'text' ? (
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Text Options</div>

              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Content</div>
                <input
                  value={selectedObject.text}
                  onChange={(e) => updateSelectedText({ text: e.target.value })}
                  className="input"
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Color</div>
                <input
                  type="color"
                  value={selectedObject.fill}
                  onChange={(e) => updateSelectedText({ fill: e.target.value })}
                  style={{ height: 40, width: '100%', borderRadius: 10 }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Font size</div>
                <input
                  type="range"
                  min={12}
                  max={100}
                  value={selectedObject.fontSize}
                  onChange={(e) => updateSelectedText({ fontSize: Number(e.target.value) })}
                />
                <div style={{ fontSize: 12, opacity: 0.7 }}>{selectedObject.fontSize}px</div>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Font family</div>
                <select
                  value={selectedObject.fontFamily}
                  onChange={(e) => updateSelectedText({ fontFamily: e.target.value })}
                  className="input"
                >
                  <option value="Roboto">Roboto</option>
                  <option value="Arial">Arial</option>
                  <option value="serif">Serif</option>
                </select>
              </label>
            </div>
          ) : null}

            <button
              onClick={() => void doAddToCart()}
              disabled={isAddingToCart}
              style={{
                padding: 10,
                fontWeight: 700,
                opacity: isAddingToCart ? 0.7 : 1,
              }}
            >
              {isAddingToCart ? 'Adding…' : 'Add to cart'}
            </button>

            <button
              onClick={openShippingForOrder}
              disabled={isOrdering}
              className="rounded-xl bg-gradient-to-r from-indigo-500/90 to-cyan-300/70 px-4 py-3 text-sm font-extrabold text-white shadow-[0_0_22px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(34,211,238,0.28)]"
              style={{ marginTop: 6, opacity: isOrdering ? 0.7 : 1 }}
            >
              {isOrdering ? 'Ordering…' : 'Order Now'}
            </button>
          </div>
        </aside>

      {isShippingOpen ? (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => (isOrdering ? null : setIsShippingOpen(false))}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1115] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
              <div className="text-lg font-extrabold">Shipping info</div>
              <div className="mt-1 text-sm text-white/60">Enter delivery details to place the order.</div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <div className="text-xs text-white/60">Name</div>
                  <input
                    value={shipping.customerName}
                    onChange={(e) => setShipping((s) => ({ ...s, customerName: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                    placeholder="Your name"
                  />
                </label>

                <label className="grid gap-2">
                  <div className="text-xs text-white/60">Phone</div>
                  <input
                    value={shipping.customerPhone}
                    onChange={(e) => setShipping((s) => ({ ...s, customerPhone: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                    placeholder="+998901234567"
                  />
                </label>

                <label className="grid gap-2">
                  <div className="text-xs text-white/60">Region</div>
                  <input
                    value={shipping.region}
                    onChange={(e) => setShipping((s) => ({ ...s, region: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                    placeholder="Tashkent"
                  />
                </label>

                <label className="grid gap-2">
                  <div className="text-xs text-white/60">Address</div>
                  <input
                    value={shipping.address}
                    onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                    placeholder="Street, house, apartment"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsShippingOpen(false)}
                  disabled={isOrdering}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void submitOrderNow()}
                  disabled={isOrdering}
                  className="rounded-xl bg-gradient-to-r from-indigo-500/90 to-cyan-300/70 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
                >
                  {isOrdering ? 'Placing…' : 'Place order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function DesignImage({
  item,
  isSelected,
  onSelect,
  onChange,
  registerNode,
  safeZone,
}: {
  item: DesignImageItem;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (next: DesignImageItem) => void;
  registerNode: (node: Konva.Node | null) => void;
  safeZone: { x: number; y: number; width: number; height: number };
}) {
  const [img] = useImage(item.url, 'anonymous');

  return (
    <KonvaImage
      image={img ?? undefined}
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
      rotation={item.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      ref={(node) => registerNode(node)}
      onDragMove={(e) => {
        const node = e.target;
        const w = node.width();
        const h = node.height();

        const nextX = clamp(node.x(), safeZone.x, safeZone.x + safeZone.width - w);
        const nextY = clamp(node.y(), safeZone.y, safeZone.y + safeZone.height - h);

        node.x(nextX);
        node.y(nextY);
      }}
      onDragEnd={(e) => {
        onChange({
          ...item,
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Image;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        const nextWidth = Math.max(5, node.width() * scaleX);
        const nextHeight = Math.max(5, node.height() * scaleY);

        const maxX = safeZone.x + safeZone.width;
        const maxY = safeZone.y + safeZone.height;
        const nextX = clamp(node.x(), safeZone.x, maxX - nextWidth);
        const nextY = clamp(node.y(), safeZone.y, maxY - nextHeight);

        node.x(nextX);
        node.y(nextY);

        onChange({
          ...item,
          x: nextX,
          y: nextY,
          width: nextWidth,
          height: nextHeight,
          rotation: node.rotation(),
        });
      }}
      opacity={isSelected ? 0.98 : 1}
    />
  );
}
